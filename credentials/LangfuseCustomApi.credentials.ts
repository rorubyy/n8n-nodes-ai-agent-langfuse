import {
	ICredentialType,
	INodeProperties,
	IAuthenticate,
	ICredentialTestRequest,
} from 'n8n-workflow';

import { parseLangfuseCustomHeaders } from '../nodes/AgentWithLangfuse/src/utils/langfuseHeaders';

export class LangfuseCustomApi implements ICredentialType {
	name = 'langfuseCustomApi';
	icon = 'file:LangfuseCustomApi.icon.svg' as const;

	displayName = 'Langfuse API';
	documentationUrl = 'https://langfuse.com/docs/api#authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'Langfuse Base URL',
			name: 'url',
			type: 'string',
			default: 'https://cloud.langfuse.com',
			description: 'The base URL for your Langfuse instance',
		},
		{
			displayName: 'Public Key',
			name: 'publicKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'Langfuse public API key (used as username for Basic Auth)',
		},
		{
			displayName: 'Secret Key',
			name: 'secretKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			required: true,
			default: '',
			description: 'Langfuse secret API key (used as password for Basic Auth)',
		},
		{
			displayName: 'Custom Headers (JSON)',
			name: 'customHeaders',
			type: 'string',
			typeOptions: {
				password: true,
				rows: 4,
			},
			default: '',
			description:
				'Optional JSON object of extra headers sent with every Langfuse request, e.g. {"CF-Access-Client-Id":"...","CF-Access-Client-Secret":"..."}',
		},
	];

	authenticate: IAuthenticate = async (credentials, requestOptions) => {
		const customHeaders = parseLangfuseCustomHeaders(credentials.customHeaders);
		requestOptions.auth = {
			username: credentials.publicKey as string,
			password: credentials.secretKey as string,
		};
		requestOptions.headers = {
			...requestOptions.headers,
			...customHeaders,
		};
		return requestOptions;
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/api/public/projects',
			method: 'GET',
		},
	};
}
