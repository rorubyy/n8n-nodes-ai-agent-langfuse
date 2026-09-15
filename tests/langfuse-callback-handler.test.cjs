const assert = require('node:assert/strict');
const test = require('node:test');

const {
	CrossModuleUsageCallbackHandler,
	extractUsageMetadataStructurally,
} = require('../dist/nodes/AgentWithLangfuse/src/utils/LangfuseCallbackHandler.js');
const { CallbackHandler } = require('langfuse-langchain');

test('reads provider usage from a message created by another LangChain copy', () => {
	const usageMetadata = {
		input_tokens: 44_127,
		output_tokens: 15,
		total_tokens: 44_142,
		input_token_details: {
			cache_creation: 0,
			cache_read: 0,
		},
	};
	const foreignLangChainMessage = {
		content: 'DIAGNOSTIC_OK',
		usage_metadata: usageMetadata,
	};
	const output = {
		generations: [[{ text: 'DIAGNOSTIC_OK', message: foreignLangChainMessage }]],
	};

	assert.deepEqual(extractUsageMetadataStructurally(output), usageMetadata);
});

test('returns undefined when the provider does not report usage metadata', () => {
	const output = {
		generations: [[{ text: 'DIAGNOSTIC_OK', message: { content: 'DIAGNOSTIC_OK' } }]],
	};

	assert.equal(extractUsageMetadataStructurally(output), undefined);
});

test('forwards structural provider usage through the tokenUsage fallback', async () => {
	const usageMetadata = {
		input_tokens: 44_127,
		output_tokens: 15,
		total_tokens: 44_142,
	};
	const output = {
		generations: [[{ message: { usage_metadata: usageMetadata } }]],
	};
	const originalHandleLLMEnd = CallbackHandler.prototype.handleLLMEnd;
	let forwardedOutput;

	CallbackHandler.prototype.handleLLMEnd = async (normalizedOutput) => {
		forwardedOutput = normalizedOutput;
	};

	try {
		const handler = new CrossModuleUsageCallbackHandler({
			publicKey: 'pk-test',
			secretKey: 'sk-test',
			baseUrl: 'http://127.0.0.1:1',
		});

		await handler.handleLLMEnd(output, 'run-test');
	} finally {
		CallbackHandler.prototype.handleLLMEnd = originalHandleLLMEnd;
	}

	assert.deepEqual(forwardedOutput.llmOutput.tokenUsage, usageMetadata);
	assert.equal(output.llmOutput, undefined, 'the original LangChain result must not be mutated');
});
