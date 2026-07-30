import { z } from 'zod';

/**
 * Client-safe env only — `clientEnv` only ever reads `NEXT_PUBLIC_*` vars, so this file is
 * safe to import from a client component. Server-only vars live in `config/env.server.ts`
 * instead, in a genuinely separate module — NOT just a separate export from this same file.
 * ES modules execute their entire file on import regardless of which named export a caller
 * asked for, so a `serverEnv` export living in *this* file would still get eagerly validated
 * (and fail, since server-only vars are correctly stripped from the browser bundle) the
 * moment ANY client code imports `clientEnv` from here — which `config/api.ts` does, and
 * every portal page transitively does via `apiClient`. Confirmed as a real, live bug: the
 * client bundle crashed with "Invalid environment configuration" on `API_INTERNAL_URL`/
 * `SESSION_COOKIE_NAME` the first time this was tested in a real browser. Two files is the
 * actual fix — see `config/env.server.ts`'s own header comment.
 */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  /** See `lib/auth/tenant.ts` — real per-visitor tenant resolution is an open product
   * decision; until then, one configured tenant id per deployment. */
  NEXT_PUBLIC_TENANT_ID: z.string().optional(),
});

export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined>,
) {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${result.error.toString()}`);
  }
  return result.data as z.infer<T>;
}

export const clientEnv = parseEnv(clientEnvSchema, {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_ANALYTICS_ID: process.env.NEXT_PUBLIC_ANALYTICS_ID,
  NEXT_PUBLIC_TENANT_ID: process.env.NEXT_PUBLIC_TENANT_ID,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
