import { describe, expect, it } from 'vitest';

import { parseLangfuseCustomHeaders } from '../../../src/utils/langfuseHeaders';

describe('parseLangfuseCustomHeaders', () => {
	it.each([undefined, null, '', '   ', '\n\t'])('returns {} for empty input %j', (raw) => {
		expect(parseLangfuseCustomHeaders(raw)).toEqual({});
	});

	it('parses a valid JSON object', () => {
		expect(
			parseLangfuseCustomHeaders(
				'{"CF-Access-Client-Id":"id.access","CF-Access-Client-Secret":"s3cret"}',
			),
		).toEqual({
			'CF-Access-Client-Id': 'id.access',
			'CF-Access-Client-Secret': 's3cret',
		});
	});

	it('accepts an already-parsed object', () => {
		expect(parseLangfuseCustomHeaders({ 'X-Test': 'a' })).toEqual({ 'X-Test': 'a' });
	});

	it('returns {} for an empty object', () => {
		expect(parseLangfuseCustomHeaders('{}')).toEqual({});
	});

	it('throws on invalid JSON without echoing the input', () => {
		const raw = '{"X-Secret": "top-secret-value"';
		expect(() => parseLangfuseCustomHeaders(raw)).toThrow(/not valid JSON/);
		try {
			parseLangfuseCustomHeaders(raw);
		} catch (e) {
			expect((e as Error).message).not.toContain('top-secret-value');
		}
	});

	it.each(['[]', '["a"]', 'null', '42', '"string"', 'true'])(
		'throws when JSON is not an object: %s',
		(raw) => {
			expect(() => parseLangfuseCustomHeaders(raw)).toThrow(/must be a JSON object/);
		},
	);

	it.each([42, true, ['a']])('throws for non-object non-string input %j', (raw) => {
		expect(() => parseLangfuseCustomHeaders(raw)).toThrow(/must be a JSON object/);
	});

	it.each([
		['number', '{"X-Num": 1}'],
		['object', '{"X-Obj": {"a": "b"}}'],
		['null', '{"X-Null": null}'],
		['boolean', '{"X-Bool": true}'],
	])('throws for a %s header value, naming the header only', (_type, raw) => {
		expect(() => parseLangfuseCustomHeaders(raw)).toThrow(/must have a string value/);
	});

	it('does not include header values in value-type errors', () => {
		try {
			parseLangfuseCustomHeaders('{"X-Obj": {"secret": "hidden-value"}}');
			expect.unreachable();
		} catch (e) {
			expect((e as Error).message).toContain('X-Obj');
			expect((e as Error).message).not.toContain('hidden-value');
		}
	});

	it.each(['X Header', 'X:Header', 'X-Héader', '', 'X\nInjected', '(X)'])(
		'rejects invalid header name %j',
		(name) => {
			expect(() => parseLangfuseCustomHeaders(JSON.stringify({ [name]: 'v' }))).toThrow(
				/invalid header name/,
			);
		},
	);

	it.each(['Authorization', 'Content-Type', 'Content-Length', 'Host'])(
		'rejects overriding reserved header %s',
		(name) => {
			expect(() => parseLangfuseCustomHeaders(JSON.stringify({ [name]: 'v' }))).toThrow(
				/cannot be overridden/,
			);
		},
	);

	it.each(['AUTHORIZATION', 'authorization', 'content-TYPE', 'CONTENT-length', 'host', 'HoSt'])(
		'rejects reserved headers case-insensitively: %s',
		(name) => {
			expect(() => parseLangfuseCustomHeaders(JSON.stringify({ [name]: 'v' }))).toThrow(
				/cannot be overridden/,
			);
		},
	);
});
