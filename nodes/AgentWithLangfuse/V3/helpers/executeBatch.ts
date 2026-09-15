import type { AgentRunnableSequence } from '@langchain/classic/agents';
import type { BaseChatMemory } from '@langchain/classic/memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { processHitlResponses } from '../../src/utils/agent-execution';
import type { RequestResponseMetadata } from '../../src/utils/agent-execution/types';
import { wrapLangChainParserError } from '../../src/utils/output_parsers/langchainParserError';
import { getOptionalOutputParser } from '../../src/utils/output_parsers/N8nOutputParser';
import { NodeOperationError, assertParamIsNumber } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	ISupplyDataFunctions,
	INodeExecutionData,
	EngineResponse,
	EngineRequest,
} from 'n8n-workflow';

import type { AgentResult } from '../types';
import { checkMaxIterations } from './checkMaxIterations';
import { createAgentSequence } from './createAgentSequence';
import { finalizeResult } from './finalizeResult';
import { prepareItemContext } from './prepareItemContext';
import { runAgent } from './runAgent';
import type { CallbackHandler } from 'langfuse-langchain';
import { CrossModuleUsageCallbackHandler } from '../../src/utils/LangfuseCallbackHandler';

type BatchResult = AgentResult | EngineRequest<RequestResponseMetadata>;

export type AgentMemoryHitCounters = { loads: number; saves: number };
/**
 * Executes a batch of items, handling both successful execution and errors.
 * Applies continue-on-fail logic when errors occur.
 *
 * @param ctx - The execution context
 * @param batch - Array of items to process in this batch
 * @param startIndex - Starting index of the batch in the original items array (used to calculate itemIndex)
 * @param model - Primary chat model
 * @param fallbackModel - Optional fallback model
 * @param memory - Optional memory for conversation context
 * @param response - Optional engine response with previous tool calls
 * @returns Object containing execution data and optional requests
 */
export async function executeBatch(
	ctx: IExecuteFunctions | ISupplyDataFunctions,
	batch: INodeExecutionData[],
	startIndex: number,
	model: BaseChatModel,
	fallbackModel: BaseChatModel | null,
	memory: BaseChatMemory | undefined,
	response?: EngineResponse<RequestResponseMetadata>,
): Promise<{
	returnData: INodeExecutionData[];
	request: EngineRequest<RequestResponseMetadata> | undefined;
	memoryHits: AgentMemoryHitCounters;
}> {
	const returnData: INodeExecutionData[] = [];
	let request: EngineRequest<RequestResponseMetadata> | undefined = undefined;
	const memoryHits: AgentMemoryHitCounters = { loads: 0, saves: 0 };

	// Process HITL (Human-in-the-Loop) tool responses before running the agent
	// If there are approved HITL tools, we need to execute the gated tools first
	const hitlResult = processHitlResponses(response, startIndex);
	ctx.logger.debug('ToolsAgent V3 processed HITL response state', {
		startIndex,
		hasApprovedHitlTools: hitlResult.hasApprovedHitlTools,
		pendingGatedToolActions: hitlResult.pendingGatedToolRequest?.actions?.map((action) => ({
			nodeName: action.nodeName,
			id: action.id,
			input: action.input,
			metadata: action.metadata,
		})),
	});

	if (hitlResult.hasApprovedHitlTools && hitlResult.pendingGatedToolRequest) {
		ctx.logger.debug('ToolsAgent V3 returning gated HITL tool request', {
			actions: hitlResult.pendingGatedToolRequest.actions.map((action) => ({
				nodeName: action.nodeName,
				id: action.id,
				input: action.input,
				metadata: action.metadata,
			})),
		});
		// Return the gated tool request immediately
		// The Agent will resume after the gated tool executes
		return {
			returnData: [],
			request: hitlResult.pendingGatedToolRequest,
			memoryHits,
		};
	}

	// Use the processed response (with HITL denials properly formatted)
	const processedResponse = hitlResult.processedResponse;

	// Check max iterations if this is a continuation of a previous execution
	const maxIterations = ctx.getNodeParameter('options.maxIterations', 0, 10);
	assertParamIsNumber('options.maxIterations', maxIterations, ctx.getNode());

	const batchPromises = batch.map(async (_item, batchItemIndex) => {
		const itemIndex = startIndex + batchItemIndex;

		checkMaxIterations(response, maxIterations, ctx.getNode());

		const itemContext = await prepareItemContext(ctx, itemIndex, processedResponse, model);

		const { tools, prompt, options, outputParser } = itemContext;

		// add langfuse handler 
		let langfuseHandler: CallbackHandler | undefined;
		try {
			const langfuseCreds = await ctx.getCredentials('langfuseCustomApi');
			const rawMetadata = ctx.getNodeParameter('langfuseMetadata', itemIndex, {}) as any;
			let parsedCustomMetadata: Record<string, unknown> | undefined;
			if (typeof rawMetadata.customMetadata === 'string') {
				try {
					parsedCustomMetadata = JSON.parse(rawMetadata.customMetadata);
				} catch {
					ctx.logger.warn('Invalid JSON in Langfuse metadata, ignoring customMetadata.');
				}
			} else {
				parsedCustomMetadata = rawMetadata.customMetadata;
			}
			langfuseHandler = new CrossModuleUsageCallbackHandler({
				publicKey: langfuseCreds.publicKey as string,
				secretKey: langfuseCreds.secretKey as string,
				baseUrl: (langfuseCreds.url as string) ?? process.env.LANGFUSE_HOST,
				sessionId: rawMetadata.sessionId,
				userId: rawMetadata.userId,
				metadata: parsedCustomMetadata,
			});
		} catch (e) {
			ctx.logger.warn('Failed to initialize Langfuse handler, continuing without tracing.', { error: e });
			langfuseHandler = undefined;
		}

		// Create executors for primary and fallback models
		const executor: AgentRunnableSequence = createAgentSequence(
			model,
			tools,
			prompt,
			options,
			outputParser,
			memory,
			fallbackModel);

		// Run the agent with processed response
		try {
			return await runAgent(ctx, executor, itemContext, model, memory, processedResponse, memoryHits, langfuseHandler
			);
		} finally {
			// Ensure buffered Langfuse events are sent before this short-lived
			// node execution ends. LangChain runs callbacks in the background by
			// default; without an explicit flush/shutdown, a generation that
			// completed (and was billed by the provider) can be silently dropped
			// if the execution ends before the SDK's internal batch timer fires.
			if (langfuseHandler) {
				try {
					await langfuseHandler.shutdownAsync();
				} catch (flushError) {
					ctx.logger.warn('Failed to flush Langfuse handler.', { error: flushError });
				}
			}
		}
	});

	const batchResults = await Promise.allSettled(batchPromises);
	// This is only used to check if the output parser is connected
	// so we can parse the output if needed. Actual output parsing is done in the loop above
	const outputParser = await getOptionalOutputParser(ctx, 0);

	batchResults.forEach((result, index) => {
		const itemIndex = startIndex + index;
		if (result.status === 'rejected') {
			const error = wrapLangChainParserError(result.reason, ctx.getNode(), itemIndex);
			if (ctx.continueOnFail()) {
				returnData.push({
					json: { error: error.message },
					pairedItem: { item: itemIndex },
				} as INodeExecutionData);
				return;
			} else {
				throw new NodeOperationError(ctx.getNode(), error);
			}
		}
		const batchResult = result.value as BatchResult;

		if (!batchResult) {
			return;
		}

		if ('actions' in batchResult) {
			if (!request) {
				request = {
					actions: batchResult.actions,
					metadata: batchResult.metadata,
				};
			} else {
				request.actions.push.apply(request.actions, batchResult.actions);
			}
			return;
		}

		// Finalize the result
		const itemResult = finalizeResult(batchResult, itemIndex, memory, outputParser);
		returnData.push(itemResult);
	});

	return { returnData, request, memoryHits };
}
