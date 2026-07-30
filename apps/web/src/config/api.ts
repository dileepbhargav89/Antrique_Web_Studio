import { clientEnv } from './env';

export const apiConfig = {
  baseUrl: clientEnv.NEXT_PUBLIC_API_BASE_URL,
  version: 'v1',
  timeoutMs: 15_000,
} as const;
