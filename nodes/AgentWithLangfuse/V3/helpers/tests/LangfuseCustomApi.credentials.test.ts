import type { IAuthenticate, IHttpRequestOptions } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { LangfuseCustomApi } from '../../../../../credentials/LangfuseCustomApi.credentials';

type AuthenticateFn = Exclude<IAuthenticate, { type: 'generic' }>;

const authenticate = new LangfuseCustomApi().authenticate as AuthenticateFn;

const baseCredentials = {
	url: 'https://langfuse.example.com',
	publicKey: 'pk-lf-123',
	secretKey: 'sk-lf-456',
};

const baseRequest = (): IHttpRequestOptions => ({
	baseURL: 'https://langfuse.example.com',
	url: '/api/public/projects',
	method: 'GET',
	headers: { Accept: 'application/json' },
});

describe('LangfuseCustomApi.authenticate', () => {
	it('declares an optional customHeaders property', () => {
		const prop = new LangfuseCustomApi().properties.find((p) => p.name === 'customHeaders');
		expect(prop).toMatchObject({
			type: 'string',
			default: '',
			typeOptions: { password: true, rows: 4 },
		});
		expect(prop?.required).toBeFalsy();
	});

	it('sets Basic auth and leaves headers unchanged when customHeaders is absent', async () => {
		const result = await authenticate(baseCredentials, baseRequest());
		expect(result.auth).toEqual({ username: 'pk-lf-123', password: 'sk-lf-456' });
		expect(result.headers).toEqual({ Accept: 'application/json' });
	});

	it('treats an empty customHeaders string as no headers', async () => {
		const result = await authenticate({ ...baseCredentials, customHeaders: '' }, baseRequest());
		expect(result.headers).toEqual({ Accept: 'application/json' });
	});

	it('merges custom headers into the request', async () => {
		const result = await authenticate(
			{
				...baseCredentials,
				customHeaders: '{"CF-Access-Client-Id":"id","CF-Access-Client-Secret":"secret"}',
			},
			baseRequest(),
		);
		expect(result.auth).toEqual({ username: 'pk-lf-123', password: 'sk-lf-456' });
		expect(result.headers).toEqual({
			Accept: 'application/json',
			'CF-Access-Client-Id': 'id',
			'CF-Access-Client-Secret': 'secret',
		});
	});

	it('works when the request has no headers yet', async () => {
		const request = baseRequest();
		delete request.headers;
		const result = await authenticate(
			{ ...baseCredentials, customHeaders: '{"X-Test":"1"}' },
			request,
		);
		expect(result.headers).toEqual({ 'X-Test': '1' });
	});

	it('throws on invalid JSON', async () => {
		await expect(
			authenticate({ ...baseCredentials, customHeaders: '{nope' }, baseRequest()),
		).rejects.toThrow(/not valid JSON/);
	});

	it('throws on reserved header override', async () => {
		await expect(
			authenticate(
				{ ...baseCredentials, customHeaders: '{"authorization":"Bearer x"}' },
				baseRequest(),
			),
		).rejects.toThrow(/cannot be overridden/);
	});
});
