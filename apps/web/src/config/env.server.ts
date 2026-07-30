import { z } from 'zod';
import { clientEnv, clientEnvSchema, parseEnv } from './env';

/**
 * Server-only env — a genuinely separate module from `config/env.ts`, not just a separate
 * export from it. Importing this file from a client component fails loudly at import time
 * (server-only vars parse as `undefined` in a browser bundle), which is the actual, working
 * version of the guard `config/env.ts` used to attempt from a single shared file — see that
 * file's own header comment for why the single-file version silently broke every portal page
 * instead. Only import `serverEnv` from Route Handlers, Server Components, or `middleware.ts`.
 */
const serverEnvSchema = clientEnvSchema.extend({
  API_INTERNAL_URL: z.string().url(),
  SESSION_COOKIE_NAME: z.string().min(1),
  SENTRY_DSN: z.string().optional(),
});

export const serverEnv = parseEnv(serverEnvSchema, {
  ...clientEnv,
  API_INTERNAL_URL: process.env.API_INTERNAL_URL,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SENTRY_DSN: process.env.SENTRY_DSN,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
