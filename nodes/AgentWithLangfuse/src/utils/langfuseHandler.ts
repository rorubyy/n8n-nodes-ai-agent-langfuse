import { CallbackHandler } from 'langfuse-langchain';
import type { ICredentialDataDecryptedObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { parseLangfuseCustomHeaders } from './langfuseHeaders';

/** Raised when the Langfuse credential is misconfigured; callers must not swallow it. */
export class LangfuseConfigError extends NodeOperationError {}

export interface LangfuseTraceOptions {
	sessionId?: string;
	userId?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Builds the Langfuse CallbackHandler from the `langfuseCustomApi` credential.
 * Invalid custom headers are raised as a LangfuseConfigError so misconfiguration
 * is visible instead of silently disabling tracing.
 */
export function createLangfuseHandler(
	node: INode,
	credentials: ICredentialDataDecryptedObject,
	options: LangfuseTraceOptions,
): CallbackHandler {
	let additionalHeaders: Record<string, string>;
	try {
		additionalHeaders = parseLangfuseCustomHeaders(credentials.customHeaders);
	} catch (error) {
		throw new LangfuseConfigError(node, (error as Error).message, {
			description: 'Check the "Custom Headers (JSON)" field of the Langfuse credential.',
		});
	}

	return new CallbackHandler({
		publicKey: credentials.publicKey as string,
		secretKey: credentials.secretKey as string,
		baseUrl: (credentials.url as string) ?? process.env.LANGFUSE_HOST,
		sessionId: options.sessionId,
		userId: options.userId,
		metadata: options.metadata,
		additionalHeaders,
	});
}
