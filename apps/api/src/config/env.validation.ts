import { z } from 'zod';

// One schema, one validated result, cached — see
// docs/architecture/validation.md for the full rationale and lifecycle.
// Only variables the implemented config layer actually reads are
// validated here (app, database, security, logging, swagger, health,
// cache, queue, email, storage — see each domain's registerAs() factory).
// Everything else in .env.example (IDP_*, JWT_* beyond what's already
// listed below, PAYMENT_*, SENTRY_DSN, OTEL_*) belongs to a config domain
// that's still a placeholder (apps/api/src/config/*/README.md) — nothing
// reads them yet, so nothing validates them yet. `email`/`storage`
// (Phase 7) are real config domains now, but every var in both is
// optional — see each var's own comment below for why.

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
  // Phase 10, Module 1 (Performance) — `pg.Pool`'s own undocumented
  // default (`max: 10`, no connection timeout) was previously left
  // implicit; these make it an explicit, tunable decision. Defaults match
  // what was already happening in practice, so this is additive-only —
  // no behavior change until an operator sets these.
  DATABASE_POOL_MAX: z.coerce
    .number({ invalid_type_error: 'DATABASE_POOL_MAX must be a valid number' })
    .int({ message: 'DATABASE_POOL_MAX must be a whole number' })
    .positive({ message: 'DATABASE_POOL_MAX must be greater than 0' })
    .default(10),
  DATABASE_POOL_IDLE_TIMEOUT_MS: z.coerce
    .number({ invalid_type_error: 'DATABASE_POOL_IDLE_TIMEOUT_MS must be a valid number' })
    .int({ message: 'DATABASE_POOL_IDLE_TIMEOUT_MS must be a whole number' })
    .positive({ message: 'DATABASE_POOL_IDLE_TIMEOUT_MS must be greater than 0' })
    .default(30_000),
  DATABASE_POOL_CONNECTION_TIMEOUT_MS: z.coerce
    .number({ invalid_type_error: 'DATABASE_POOL_CONNECTION_TIMEOUT_MS must be a valid number' })
    .int({ message: 'DATABASE_POOL_CONNECTION_TIMEOUT_MS must be a whole number' })
    .positive({ message: 'DATABASE_POOL_CONNECTION_TIMEOUT_MS must be greater than 0' })
    .default(5_000),

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

  // jwt (Phase 1.2D.6) — infrastructure only, nothing signs/verifies a
  // real token yet (see apps/api/src/jwt/README.md). Secrets required,
  // no default (same treatment as DATABASE_URL/REDIS_URL — a real
  // cryptographic secret shouldn't have an app-side fallback), with a
  // minimum length: a short secret is brute-forceable regardless of the
  // signing algorithm, so this is a genuine security constraint, not a
  // speculative one. TTLs are plain integer seconds (not a duration
  // string like "15m") to match .env.example's existing
  // JWT_ACCESS_TOKEN_TTL/JWT_REFRESH_TOKEN_TTL values, which predate
  // this phase — @nestjs/jwt's signOptions.expiresIn accepts a number
  // of seconds natively, no string parsing needed.
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters long' }),
  JWT_ACCESS_TOKEN_TTL: z.coerce
    .number({ invalid_type_error: 'JWT_ACCESS_TOKEN_TTL must be a valid number of seconds' })
    .int({ message: 'JWT_ACCESS_TOKEN_TTL must be a whole number' })
    .positive({ message: 'JWT_ACCESS_TOKEN_TTL must be greater than 0' })
    .default(900),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters long' }),
  JWT_REFRESH_TOKEN_TTL: z.coerce
    .number({ invalid_type_error: 'JWT_REFRESH_TOKEN_TTL must be a valid number of seconds' })
    .int({ message: 'JWT_REFRESH_TOKEN_TTL must be a whole number' })
    .positive({ message: 'JWT_REFRESH_TOKEN_TTL must be greater than 0' })
    .default(2592000),

  // hash (Phase 1.2D.7) — Argon2id tuning parameters only, consumed by
  // apps/api/src/password/config/hash.config.ts (see
  // apps/api/src/password/README.md). All three are OWASP-recommended
  // Argon2id minimums, tunable per-environment (e.g. lower on a resource-
  // constrained dev box) without a code change — the algorithm variant
  // itself (argon2id) is NOT exposed here, the same "not configurable"
  // treatment already applied to the JWT signing algorithm (HS256, fixed
  // in token.service.ts): a configurable variant would let an environment
  // accidentally weaken to argon2i/argon2d, a security regression rather
  // than a legitimate environment difference.
  HASH_MEMORY_COST: z.coerce
    .number({ invalid_type_error: 'HASH_MEMORY_COST must be a valid number of kilobytes' })
    .int({ message: 'HASH_MEMORY_COST must be a whole number' })
    .positive({ message: 'HASH_MEMORY_COST must be greater than 0' })
    .default(19456),
  HASH_TIME_COST: z.coerce
    .number({ invalid_type_error: 'HASH_TIME_COST must be a valid number of iterations' })
    .int({ message: 'HASH_TIME_COST must be a whole number' })
    .positive({ message: 'HASH_TIME_COST must be greater than 0' })
    .default(2),
  HASH_PARALLELISM: z.coerce
    .number({ invalid_type_error: 'HASH_PARALLELISM must be a valid number of threads' })
    .int({ message: 'HASH_PARALLELISM must be a whole number' })
    .positive({ message: 'HASH_PARALLELISM must be greater than 0' })
    .default(1),

  // runtime metadata (Milestone 14 — Production Infrastructure) — stamped
  // by the CI/CD pipeline (`.github/workflows/ci.yml`) and the Docker build
  // (`infrastructure/docker/api.Dockerfile`'s `APP_VERSION`/`GIT_COMMIT_SHA`
  // build args), never introspected from `package.json` at runtime — a
  // build-output-layout-independent value survives `dist/` restructuring,
  // and matches how every other externally-supplied identity value in this
  // schema (DATABASE_URL, JWT secrets) already works: the app reads what
  // it's told, it doesn't go looking. Defaults are safe, obviously-a-
  // default placeholders for local dev, where "what exact version am I
  // running" is never a real question.
  APP_VERSION: z.string().min(1).default('0.0.0-dev'),
  GIT_COMMIT_SHA: z.string().default('unknown'),

  // swagger production guard (Milestone 14) — see SWAGGER_ENABLED above and
  // this schema's own `superRefine` below. A second, independently-set flag
  // rather than reusing SWAGGER_ENABLED's own value: requires a deliberate,
  // separate opt-in to run Swagger in production, so a `.env` that already
  // has `SWAGGER_ENABLED=true` from local dev (a very plausible copy-paste
  // starting point for a new environment's config) doesn't silently expose
  // the full API surface in production the moment NODE_ENV flips.
  SWAGGER_ALLOW_IN_PRODUCTION: booleanFromString('false'),

  // email (Phase 7 — Real Email) — RESEND_API_KEY/EMAIL_FROM_ADDRESS are
  // BOTH optional, deliberately not required-with-no-default like
  // DATABASE_URL/JWT secrets above: this app must still boot and serve
  // every existing route with zero real email credentials configured
  // (EmailService itself no-ops with a logged warning when unset — see
  // apps/api/src/email/email.service.ts). A missing secret here is a
  // reduced-capability startup, not a startup failure.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z
    .string()
    .email({ message: 'EMAIL_FROM_ADDRESS must be a valid email address' })
    .optional(),

  // storage (Phase 7 — Product Image Upload) — same "optional, reduced
  // capability rather than a hard boot failure" treatment as email above.
  // STORAGE_ENDPOINT is new (not in the original placeholder .env.example)
  // — lets this target any S3-API-compatible provider (Cloudflare R2,
  // DigitalOcean Spaces, MinIO), not only real AWS S3; omitted, the AWS
  // SDK falls back to its own real-AWS endpoint resolution for the given
  // region. STORAGE_PUBLIC_URL_BASE is also new — how an uploaded object
  // key becomes the public URL stored on ProductImage.url.
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_ENDPOINT: z.string().url({ message: 'STORAGE_ENDPOINT must be a valid URL' }).optional(),
  STORAGE_PUBLIC_URL_BASE: z
    .string()
    .url({ message: 'STORAGE_PUBLIC_URL_BASE must be a valid URL' })
    .optional(),

  // ai (Phase 8 — AI Workspace) — same "optional, reduced capability rather
  // than a hard boot failure" treatment as email/storage above: this app
  // must still boot and serve every existing route with zero AI credentials
  // configured. AiService.complete() throws a 503 at the one call site that
  // needs a real key (see apps/api/src/ai/README.md), not here. Only
  // Anthropic has a real tested implementation; the other three keys/models
  // exist so their adapters are configurable the moment a real key is added,
  // without a code change.
  AI_DEFAULT_PROVIDER: z.enum(['anthropic', 'openai', 'gemini', 'openrouter']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GOOGLE_AI_MODEL: z.string().default('gemini-2.0-flash'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-sonnet-4.5'),

  // defaultTenant (Milestone 1 — Real Authentication) — a stopgap, not real
  // multi-tenant resolution: no subdomain/header-based tenant-resolution
  // mechanism exists anywhere in this app, and building one is explicitly
  // out of this milestone's scope. Every query this milestone adds against
  // `User` (a multi-tenant table) is scoped to this one, fixed tenant —
  // satisfying CLAUDE.md's non-negotiable "tenant scope on EVERY query"
  // rule honestly, without pretending multi-tenant switching exists yet.
  // Required, no default — a wrong/missing tenant ID here means every
  // login silently queries the wrong (or a nonexistent) tenant's users,
  // the same "no sensible fallback for a real identifier" treatment
  // DATABASE_URL/REDIS_URL/JWT secrets already get. Consumed by
  // apps/api/src/modules/auth/config/default-tenant.config.ts — see
  // apps/api/src/modules/auth/README.md.
  DEFAULT_TENANT_ID: z.string().uuid({ message: 'DEFAULT_TENANT_ID must be a valid UUID' }),
});

// The exact placeholder secret values apps/api/.env.example ships — the
// starting point anyone copies to create a real .env. Comparing against
// these two literals (not a generic "looks weak" heuristic, which would be
// either too strict or too loose) catches the single most concrete, most
// likely real-world production-safety failure this app can detect: a
// deployment that copied .env.example and never replaced the secret.
const PLACEHOLDER_JWT_SECRETS = new Set([
  'replace-me-with-a-real-random-secret-32-chars-min',
  'replace-me-with-a-different-real-random-secret-32-chars-min',
]);

// Milestone 14 (Production Infrastructure) — "Detect: unsafe production
// settings." Cross-field checks a per-field `z.string()`/`z.enum()` schema
// entry can't express on its own (each of these depends on NODE_ENV's own
// value) — `superRefine` runs after every individual field already passed
// its own validation, so these three checks only ever see already-well-
// formed values, never a missing/malformed one (that's already a distinct,
// earlier error from the per-field rules above). Each is a *specific,
// verifiable* production misconfiguration, not a vague "looks risky"
// heuristic — the same bar this codebase's other security-relevant
// defaults (JWT algorithm pinning, Argon2 variant) already hold
// themselves to: a real, nameable regression, not speculative hardening.
const envSchemaWithProductionSafety = envSchema.superRefine((data, ctx) => {
  if (data.NODE_ENV !== 'production') {
    return;
  }

  if (data.SWAGGER_ENABLED && !data.SWAGGER_ALLOW_IN_PRODUCTION) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SWAGGER_ENABLED'],
      message:
        'SWAGGER_ENABLED must be false in production unless SWAGGER_ALLOW_IN_PRODUCTION=true — ' +
        'Swagger documents the full API surface, including every DTO shape; enabling it in ' +
        'production requires a deliberate second opt-in, not a copied-over dev default.',
    });
  }

  if (!data.DATABASE_SSL) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['DATABASE_SSL'],
      message:
        'DATABASE_SSL must be true in production — an unencrypted database connection is not ' +
        'acceptable outside local development.',
    });
  }

  if (PLACEHOLDER_JWT_SECRETS.has(data.JWT_ACCESS_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_ACCESS_SECRET'],
      message:
        'JWT_ACCESS_SECRET is still the placeholder value from .env.example — generate a real ' +
        'secret (e.g. `openssl rand -base64 48`) before deploying to production.',
    });
  }

  if (PLACEHOLDER_JWT_SECRETS.has(data.JWT_REFRESH_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['JWT_REFRESH_SECRET'],
      message:
        'JWT_REFRESH_SECRET is still the placeholder value from .env.example — generate a real ' +
        'secret (e.g. `openssl rand -base64 48`) before deploying to production.',
    });
  }
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

  const result = envSchemaWithProductionSafety.safeParse(config);
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
