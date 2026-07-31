# Environment Reference

New this milestone (Milestone 14 — Production Infrastructure). The
authoritative per-variable reference for `apps/api`; `apps/api/.env.example`
is the copy-pasteable starting point, `apps/api/src/config/env.validation.ts`
is the enforced source of truth (a variable documented here that schema
doesn't validate is aspirational, not real — see that file's own header
comment for which config domains are still placeholders).

## How validation works

One Zod schema (`envSchema`), one call (`validateEnv()`), run once at
`ConfigModule` evaluation time — before `NestFactory.create()` resolves,
so an invalid `.env` aborts the process before it starts listening (fail
fast, not a lazy failure on first use). A second layer,
`envSchemaWithProductionSafety` (a `.superRefine()` wrapping the same
schema), runs cross-field checks that only make sense once `NODE_ENV` is
known — see "Production-safety checks" below.

## Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `4000` | |
| `LOG_LEVEL` | no | `info` | `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace` |
| `LOG_FORMAT` | no | `json` | `json`\|`pretty` |
| `CORS_ALLOWED_ORIGINS` | no | `` (empty → deny-all) | comma-separated allowlist |
| `DATABASE_URL` | **yes** | — | Postgres connection string |
| `DATABASE_SSL` | no | `false` | **must be `true` in production** — see below |
| `DATABASE_SHADOW_URL` | no | — | only for `prisma migrate dev`'s shadow-DB diffing |
| `REDIS_URL` | **yes** | — | consumed by `RedisService` (`apps/api/src/cache/redis.service.ts`) — a real Redis connection, backing `CacheService` in production since Phase 10, Module 8's revisit. `queue` remains a placeholder (no Redis-backed job queue exists — see `jobs/README.md`). |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | app-wide throttle window |
| `RATE_LIMIT_MAX` | no | `100` | app-wide throttle budget per window |
| `JWT_ACCESS_SECRET` | **yes** | — | min 32 chars; **must not be the `.env.example` placeholder in production** |
| `JWT_ACCESS_TOKEN_TTL` | no | `900` (15 min) | seconds |
| `JWT_REFRESH_SECRET` | **yes** | — | min 32 chars; distinct from `JWT_ACCESS_SECRET`; same placeholder check |
| `JWT_REFRESH_TOKEN_TTL` | no | `2592000` (30 days) | seconds |
| `HASH_MEMORY_COST` | no | `19456` | Argon2id, KB |
| `HASH_TIME_COST` | no | `2` | Argon2id iterations |
| `HASH_PARALLELISM` | no | `1` | Argon2id threads |
| `DEFAULT_TENANT_ID` | **yes** | — | UUID; dev-only stopgap (see `TenantMiddleware`) |
| `SWAGGER_ENABLED` | no | `true` | see "Swagger in production" below |
| `SWAGGER_ALLOW_IN_PRODUCTION` | no | `false` | second opt-in, production only |
| `SWAGGER_PATH` | no | `/api/docs` | |
| `HEALTH_PATH` | no | `/health` | documented default only — see health.controller.ts's own comment for why this isn't yet truly dynamic |
| `APP_VERSION` | no | `0.0.0-dev` | stamped by CI/Docker build args, not introspected — see below |
| `GIT_COMMIT_SHA` | no | `unknown` | same |

Every other variable in `.env.example` (`IDP_*`, `PAYMENT_*`, `STORAGE_*`,
`EMAIL_*`, `SENTRY_DSN`, `OTEL_*`) belongs to a config domain that's still a
placeholder — nothing reads or validates it yet (see that file's own header
comment).

## Production-safety checks (NODE_ENV=production only)

Four checks run automatically, all-or-nothing (every violation is
aggregated into one startup error, not just the first):

1. `SWAGGER_ENABLED=true` requires `SWAGGER_ALLOW_IN_PRODUCTION=true` too —
   a deliberate second opt-in, so a `.env` copied from local dev doesn't
   silently expose the full API surface the moment `NODE_ENV` flips.
2. `DATABASE_SSL` must be `true` — an unencrypted database connection is
   not acceptable outside local development.
3. `JWT_ACCESS_SECRET` must not equal `.env.example`'s literal placeholder
   value.
4. `JWT_REFRESH_SECRET` must not equal `.env.example`'s literal placeholder
   value (a different placeholder from #3 — the two must already be
   distinct per the per-field schema rule, but a deployment that copied
   BOTH placeholders unmodified is exactly the failure mode this catches).

None of these run outside `NODE_ENV=production` — a local `.env` with
`DATABASE_SSL=false` and the example JWT secrets is expected and fine.

## Runtime version stamping (`APP_VERSION`/`GIT_COMMIT_SHA`)

Deliberately **not** introspected from `package.json` at runtime — a
build-output-layout-independent value survives `dist/` restructuring, and
matches how every other externally-supplied identity value in this schema
(`DATABASE_URL`, JWT secrets) already works: the app reads what it's told,
it doesn't go looking. In practice: `infrastructure/docker/api.Dockerfile`'s
`runtime` stage accepts `APP_VERSION`/`GIT_COMMIT_SHA` as build `ARG`s and
bakes them into the image as `ENV`; `.github/workflows/ci.yml`'s
"Docker build" step passes `${{ github.sha }}` for both. Surfaced via the
admin-only `GET /runtime` endpoint (`modules/admin/runtime.controller.ts`).

## Swagger in production

`SWAGGER_ENABLED` defaults `true` for local-dev convenience. In
production it must be explicitly `false` (the safe default) unless
`SWAGGER_ALLOW_IN_PRODUCTION=true` is ALSO set — see "Production-safety
checks" above and `docs/architecture/security.md` §5/§6 for the full
reasoning. When enabled, the full OpenAPI document (every DTO shape,
every route) is served at `SWAGGER_PATH` (default `/api/docs`) with no
additional access control — treat enabling it in production as
equivalent to publishing the API's full surface, not a diagnostic toggle.

## Per-environment starting points

- **Local development:** copy `apps/api/.env.example` to `apps/api/.env`
  unmodified — every default is chosen for this case (Swagger on,
  DATABASE_SSL off, example JWT secrets accepted).
- **CI:** `.github/workflows/ci.yml`'s `migration-validation` job sets only
  `DATABASE_URL` (the one variable `prisma migrate deploy`/`status` need) —
  the full app is never booted in CI; the `lint-typecheck-test-build` job
  runs the test suite, which mocks every repository and never needs a real
  `.env` at all.
- **Production:** every `(validated)` variable above must be set to a real
  value; `NODE_ENV=production`; `DATABASE_SSL=true`; real, distinct,
  high-entropy `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`; `SWAGGER_ENABLED`
  left `false` unless deliberately serving docs; `CORS_ALLOWED_ORIGINS` set
  to the real frontend origin(s) — see `docs/architecture/release.md`'s
  deployment checklist for the full pre-flight list.
