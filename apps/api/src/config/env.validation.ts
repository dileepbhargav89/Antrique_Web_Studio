import { z } from 'zod';

// One schema, one validated result, cached — see
// docs/architecture/validation.md for the full rationale and lifecycle.
// Only variables the implemented config layer actually reads are
// validated here (app, database, security, logging, swagger, health,
// cache, queue — see each domain's registerAs() factory). Everything else
// in .env.example (IDP_*, JWT_*, PAYMENT_*, STORAGE_*, EMAIL_*,
// SENTRY_DSN, OTEL_*) belongs to a config domain that's still a
// placeholder (apps/api/src/config/*/README.md) — nothing reads them yet,
// so nothing validates them yet.

// z.coerce.boolean() is NOT used here: it runs JS `Boolean(x)`, which
// coerces ANY non-empty string — including the literal string "false" — to
// `true`. That would silently invert DATABASE_SSL=false. Restricting to
// the literal strings "true"/"false" and transforming explicitly avoids
// that trap and rejects anything else (e.g. "1", "yes") with a clear error
// instead of silently misinterpreting it.
const booleanFromString = (defaultValue: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Custom messages on every constraint, not just the base type check —
  // z.coerce.number() alone reports a non-numeric string as "received nan"
  // (Zod's internal representation of the failed coercion), which reads as
  // a cryptic/technical error to someone who just typo'd .env's PORT value.
  PORT: z.coerce
    .number({ invalid_type_error: 'PORT must be a valid port number (e.g. 4000)' })
    .int({ message: 'PORT must be a whole number, not a decimal' })
    .positive({ message: 'PORT must be greater than 0' })
    .max(65535, { message: 'PORT must be 65535 or less' })
    .default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  // Comma-separated in .env; parsed to a trimmed, non-empty, de-duplicated
  // string array exactly once, here — app.config.ts consumes the array
  // directly, it doesn't re-split or re-clean the raw string itself.
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((value) => [
      ...new Set(
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    ]),
  // Required — no sensible default for a real database connection string.
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection string URL' }),
  DATABASE_SSL: booleanFromString('false'),

  // security — cross-cutting rate-limit policy, feeds the `security` domain
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number({ invalid_type_error: 'RATE_LIMIT_WINDOW_MS must be a valid number of milliseconds' })
    .int({ message: 'RATE_LIMIT_WINDOW_MS must be a whole number' })
    .positive({ message: 'RATE_LIMIT_WINDOW_MS must be greater than 0' })
    .default(60000),
  RATE_LIMIT_MAX: z.coerce
    .number({ invalid_type_error: 'RATE_LIMIT_MAX must be a valid number' })
    .int({ message: 'RATE_LIMIT_MAX must be a whole number' })
    .positive({ message: 'RATE_LIMIT_MAX must be greater than 0' })
    .default(100),

  // logging — LOG_LEVEL stays under `app` (already shipped there, not
  // relocated); LOG_FORMAT is new, distinct content for the `logging` domain
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // swagger — config only; no Swagger UI is wired up yet (Phase 1.2B+)
  SWAGGER_ENABLED: booleanFromString('true'),
  SWAGGER_PATH: z.string().min(1).default('/api/docs'),

  // health — config only; no health-check controller is wired up yet
  HEALTH_PATH: z.string().min(1).default('/health'),

  // cache / queue — same Redis instance, two distinct config namespaces
  // (see configuration.md's cache/queue split rationale). Required, no
  // default, same treatment as DATABASE_URL: a real external connection
  // string shouldn't have an app-side fallback baked in.
  REDIS_URL: z.string().url({ message: 'REDIS_URL must be a valid connection string URL' }),
});

export type EnvVars = z.infer<typeof envSchema>;

let cachedEnv: EnvVars | undefined;

/**
 * Validates process.env against envSchema and returns the typed, coerced
 * result. Cached after the first successful call so the schema runs
 * exactly once per process, regardless of whether ConfigModule's
 * `validate` option or a registerAs() factory calls it first — both read
 * the same real process.env, so call order never changes the result.
 *
 * Throws a single, formatted Error (not a ZodError) on invalid input —
 * intended to escape ConfigModule.forRoot() during NestFactory.create()
 * and terminate the process before any HTTP listener starts.
 */
export function validateEnv(config: Record<string, unknown> = process.env): EnvVars {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration — refusing to start.\n${issues}\n\n` +
        `Fix the variable(s) above (see apps/api/.env.example for the expected ` +
        `shape) and restart.`,
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}
