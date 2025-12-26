import type { z } from 'zod';

export type OpenAICompatibleCredential = { apiKey: string; url: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ZodObjectAny = z.ZodObject<any>;