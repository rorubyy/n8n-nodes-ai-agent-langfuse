/**
 * Parsing for the optional "Custom Headers (JSON)" field of the Langfuse credential.
 * Kept free of LangChain / n8n runtime imports so the credential can load it cheaply.
 * Error messages may name a header but never include header values.
 */

const ERROR_PREFIX = 'Invalid Langfuse custom headers';

// RFC 7230 section 3.2.6 "token"
const HEADER_NAME_REGEX = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const RESERVED_HEADERS = new Set(['authorization', 'content-type', 'content-length', 'host']);

export function parseLangfuseCustomHeaders(raw: unknown): Record<string, string> {
	if (raw === undefined || raw === null) return {};

	let parsed: unknown = raw;
	if (typeof raw === 'string') {
		if (raw.trim() === '') return {};
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new Error(`${ERROR_PREFIX}: value is not valid JSON`);
		}
	}

	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error(`${ERROR_PREFIX}: value must be a JSON object of header names to string values`);
	}

	const headers: Record<string, string> = {};
	for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
		if (!HEADER_NAME_REGEX.test(name)) {
			throw new Error(`${ERROR_PREFIX}: invalid header name "${name}"`);
		}
		if (RESERVED_HEADERS.has(name.toLowerCase())) {
			throw new Error(`${ERROR_PREFIX}: header "${name}" cannot be overridden`);
		}
		if (typeof value !== 'string') {
			throw new Error(`${ERROR_PREFIX}: header "${name}" must have a string value`);
		}
		headers[name] = value;
	}

	return headers;
}
