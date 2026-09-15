import type { LLMResult } from '@langchain/core/outputs';
import { CallbackHandler } from 'langfuse-langchain';

type UsageMetadata = {
	input_tokens?: number;
	output_tokens?: number;
	total_tokens?: number;
	input_token_details?: Record<string, number>;
	output_token_details?: Record<string, number>;
};

type GenerationWithUsageMetadata = {
	message?: {
		usage_metadata?: UsageMetadata;
	};
};

export function extractUsageMetadataStructurally(output: LLMResult): UsageMetadata | undefined {
	const lastGenerationBatch = output.generations[output.generations.length - 1];
	const lastGeneration = lastGenerationBatch?.[
		lastGenerationBatch.length - 1
	] as GenerationWithUsageMetadata | undefined;
	const usageMetadata = lastGeneration?.message?.usage_metadata;

	if (!usageMetadata || typeof usageMetadata !== 'object') return undefined;

	return usageMetadata;
}

/**
 * Supports LangChain messages created by a different installed copy of
 * `@langchain/core` when using the Langfuse V3 callback.
 *
 * `langfuse-langchain` V3 checks `instanceof AIMessage` before reading
 * `message.usage_metadata`. That check fails when the n8n model sub-node and
 * this community node load different copies of `@langchain/core`. Exposing the
 * provider usage through `llmOutput.tokenUsage` activates the callback's
 * structural fallback without mutating the result received by other callbacks.
 */
export class CrossModuleUsageCallbackHandler extends CallbackHandler {
	override async handleLLMEnd(
		output: LLMResult,
		runId: string,
		parentRunId?: string,
	): Promise<void> {
		const usageMetadata = extractUsageMetadataStructurally(output);

		if (!usageMetadata) {
			return await super.handleLLMEnd(output, runId, parentRunId);
		}

		const normalizedOutput: LLMResult = {
			...output,
			llmOutput: {
				...output.llmOutput,
				tokenUsage: usageMetadata,
			},
		};

		return await super.handleLLMEnd(normalizedOutput, runId, parentRunId);
	}
}
