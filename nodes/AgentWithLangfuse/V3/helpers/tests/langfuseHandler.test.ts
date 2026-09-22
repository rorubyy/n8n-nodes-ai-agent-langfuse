import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLangfuseHandler, LangfuseConfigError } from '../../../src/utils/langfuseHandler';

const { CallbackHandlerMock } = vi.hoisted(() => ({ CallbackHandlerMock: vi.fn() }));

vi.mock('langfuse-langchain', () => ({ CallbackHandler: CallbackHandlerMock }));

const node = { id: '1', name: 'AI Agent', type: 'agentWithLangfuse', typeVersion: 3 } as INode;

const baseCredentials = {
	url: 'https://langfuse.example.com',
	publicKey: 'pk-lf-123',
	secretKey: 'sk-lf-456',
};

const traceOptions = { sessionId: 's-1', userId: 'u-1', metadata: { env: 'test' } };

describe('createLangfuseHandler', () => {
	beforeEach(() => {
		CallbackHandlerMock.mockClear();
	});

	it('passes custom headers as additionalHeaders', () => {
		createLangfuseHandler(
			node,
			{
				...baseCredentials,
				customHeaders: '{"CF-Access-Client-Id":"id","CF-Access-Client-Secret":"secret"}',
			},
			traceOptions,
		);

		expect(CallbackHandlerMock).toHaveBeenCalledTimes(1);
		expect(CallbackHandlerMock).toHaveBeenCalledWith({
			publicKey: 'pk-lf-123',
			secretKey: 'sk-lf-456',
			baseUrl: 'https://langfuse.example.com',
			sessionId: 's-1',
			userId: 'u-1',
			metadata: { env: 'test' },
			additionalHeaders: {
				'CF-Access-Client-Id': 'id',
				'CF-Access-Client-Secret': 'secret',
			},
		});
	});

	it('passes empty additionalHeaders for credentials without customHeaders', () => {
		createLangfuseHandler(node, baseCredentials, traceOptions);

		expect(CallbackHandlerMock).toHaveBeenCalledWith(
			expect.objectContaining({ additionalHeaders: {} }),
		);
	});

	it('does not put custom headers into trace metadata', () => {
		createLangfuseHandler(
			node,
			{ ...baseCredentials, customHeaders: '{"CF-Access-Client-Secret":"secret"}' },
			traceOptions,
		);

		const params = CallbackHandlerMock.mock.calls[0][0];
		expect(JSON.stringify(params.metadata)).not.toContain('secret');
	});

	it('throws a LangfuseConfigError (NodeOperationError) on invalid JSON and does not construct a handler', () => {
		let thrown: unknown;
		try {
			createLangfuseHandler(
				node,
				{ ...baseCredentials, customHeaders: '{"X-Secret": "hidden' },
				traceOptions,
			);
		} catch (e) {
			thrown = e;
		}

		expect(thrown).toBeInstanceOf(LangfuseConfigError);
		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect((thrown as Error).message).toMatch(/not valid JSON/);
		expect((thrown as Error).message).not.toContain('hidden');
		expect(CallbackHandlerMock).not.toHaveBeenCalled();
	});

	it('throws a LangfuseConfigError on reserved header override', () => {
		expect(() =>
			createLangfuseHandler(
				node,
				{ ...baseCredentials, customHeaders: '{"Authorization":"Bearer x"}' },
				traceOptions,
			),
		).toThrow(LangfuseConfigError);
	});
});
