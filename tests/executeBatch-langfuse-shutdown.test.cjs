const assert = require('node:assert/strict');
const test = require('node:test');

const prepareItemContextModule = require('../dist/nodes/AgentWithLangfuse/V3/helpers/prepareItemContext.js');
const createAgentSequenceModule = require('../dist/nodes/AgentWithLangfuse/V3/helpers/createAgentSequence.js');
const runAgentModule = require('../dist/nodes/AgentWithLangfuse/V3/helpers/runAgent.js');
const langfuseHandlerModule = require('../dist/nodes/AgentWithLangfuse/src/utils/LangfuseCallbackHandler.js');
const { executeBatch } = require('../dist/nodes/AgentWithLangfuse/V3/helpers/executeBatch.js');

function buildCtx() {
	const params = {
		'options.maxIterations': 10,
		hasOutputParser: false,
	};
	return {
		logger: { debug() {}, warn() {} },
		getNodeParameter(name, _index, fallback) {
			return name in params ? params[name] : fallback;
		},
		getCredentials: async () => ({
			publicKey: 'pk-test',
			secretKey: 'sk-test',
			url: 'http://127.0.0.1:1',
		}),
		getNode: () => ({ id: 'test-node', name: 'Test Node', type: 'test.node', typeVersion: 1 }),
		continueOnFail: () => true,
	};
}

test('executeBatch shuts down the Langfuse handler even when runAgent fails', async (t) => {
	const originalPrepareItemContext = prepareItemContextModule.prepareItemContext;
	const originalCreateAgentSequence = createAgentSequenceModule.createAgentSequence;
	const originalRunAgent = runAgentModule.runAgent;
	const originalHandlerClass = langfuseHandlerModule.CrossModuleUsageCallbackHandler;

	let shutdownCalls = 0;
	class FakeLangfuseHandler {
		async shutdownAsync() {
			shutdownCalls += 1;
		}
	}

	prepareItemContextModule.prepareItemContext = async () => ({
		tools: [],
		prompt: {},
		options: {},
		outputParser: undefined,
	});
	createAgentSequenceModule.createAgentSequence = () => ({});
	langfuseHandlerModule.CrossModuleUsageCallbackHandler = FakeLangfuseHandler;

	t.after(() => {
		prepareItemContextModule.prepareItemContext = originalPrepareItemContext;
		createAgentSequenceModule.createAgentSequence = originalCreateAgentSequence;
		runAgentModule.runAgent = originalRunAgent;
		langfuseHandlerModule.CrossModuleUsageCallbackHandler = originalHandlerClass;
	});

	await t.test('success path: shutdownAsync runs after runAgent resolves', async () => {
		shutdownCalls = 0;
		runAgentModule.runAgent = async () => ({ output: 'ok' });

		const result = await executeBatch(buildCtx(), [{ json: {} }], 0, {}, null, undefined, undefined);

		assert.equal(shutdownCalls, 1);
		assert.equal(result.returnData.length, 1);
		assert.equal(result.returnData[0].json.output, 'ok');
	});

	await t.test('error path: shutdownAsync still runs when runAgent throws', async () => {
		shutdownCalls = 0;
		runAgentModule.runAgent = async () => {
			throw new Error('boom');
		};

		const result = await executeBatch(buildCtx(), [{ json: {} }], 0, {}, null, undefined, undefined);

		assert.equal(shutdownCalls, 1, 'shutdownAsync must run from the finally block even when runAgent throws');
		assert.equal(result.returnData.length, 1);
		assert.equal(result.returnData[0].json.error, 'boom');
	});
});
