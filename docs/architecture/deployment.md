# Deployment

New this milestone (Milestone 14 — Production Infrastructure). Companion to
`backend.md` (what got built) and `security.md` (what got hardened) — this
doc covers how `apps/api` gets built into a deployable artifact, boots,
serves traffic, and shuts down. Scoped to `apps/api`; `apps/web`'s own
Docker image (`infrastructure/docker/web.Dockerfile`) is unchanged by this
milestone (backend-only scope, per this milestone's own brief).

## 1. Docker

`infrastructure/docker/api.Dockerfile` — multi-stage, four stages:

```
base  → deps (pnpm install, cached while lockfiles/manifests unchanged)
      → dev (full source, framework watch mode — docker-compose.override.yml)
      → build (tsc compile + pnpm deploy --prod, production node_modules only)
      → runtime (minimal, non-root, the one stage that actually ships)
```

**Fixed this milestone:** the `runtime` stage's `CMD` pointed at
`dist/main.js`, which has never existed — `tsconfig.json`'s multi-root
`include` makes `tsc` emit under `dist/src/`. `apps/api/package.json`'s own
`start` script already had this exact fix (Phase 1 production-readiness
audit, see `decisions.md`); this Dockerfile had silently drifted from it,
undetected because nothing had ever run the `runtime` stage end to end
before this milestone's own live-boot validation. Now `CMD ["node",
"dist/src/main.js"]`.

**Hardened this milestone:**
- **Non-root.** The `runtime` stage creates a fixed-uid/gid `antrique` user
  and `USER antrique`s before `CMD` — a container compromise doesn't get
  root inside its own namespace for free.
- **`HEALTHCHECK`.** Exercises the real `/health/live` endpoint via a
  Node one-liner (`curl`/`wget` aren't installed in this minimal Alpine
  image; adding either just for this would grow the image for no other
  benefit) — `--interval=30s --timeout=3s --start-period=10s --retries=3`.
- **Version stamping.** `ARG APP_VERSION`/`ARG GIT_COMMIT_SHA` (both
  default to an obviously-a-placeholder value for a manual local build),
  baked into the image as `ENV`, read by `env.validation.ts` — see
  `environment.md`.

**Layer caching / image size / build speed** (pre-existing design, not
changed this milestone, verified still sound): the `deps` stage only
`COPY`s manifests (`package.json`s + the lockfile) before running `pnpm
install` — a source-only change never busts that layer's cache. `runtime`
copies ONLY `dist/`, production `node_modules` (via `pnpm deploy --prod`,
which excludes devDependencies entirely), and `package.json` from the
`build` stage — no compiler, no TypeScript source, no dev tooling ships.

### `.dockerignore`

New this milestone (root of the repo — every Dockerfile here builds from
the repo root as its context). Excludes `node_modules`/`dist`/`.next`
(rebuilt inside the image; a host copy would bake in the wrong platform's
native binaries), `.env`/`.env.*` (real local secrets — never let these
into a build context, even transiently), and doc/infra paths no Dockerfile
actually reads. Smaller context, faster upload, and — the part that
matters most — no secret ever reaches the Docker daemon's build context.

### `docker-compose.yml` vs `docker-compose.prod.yml`

`docker-compose.yml` (pre-existing) is dev-oriented: `runtime`-target
images by default, auto-merged with `docker-compose.override.yml` for
hot-reload, host ports exposed on `postgres`/`redis` for local `psql`/
`redis-cli` access, no restart policy. **New this milestone:**
`docker-compose.prod.yml` is a genuinely production-shaped stack for a
single-host/VM deployment target — no `postgres`/`redis` host port
exposure, `restart: unless-stopped` on every service, `env_file`
`required: true` (a production deployment with no real config is a startup
failure, not a fallback), and `APP_VERSION`/`GIT_COMMIT_SHA` build args
wired through. Run with `docker compose -f docker-compose.prod.yml up -d`
— deliberately never auto-merged with `docker-compose.override.yml` (that
file is dev-only hot-reload convenience).

### Phase 10, Module 11 (Docker/infra) hardening (2026-07-31)

Audit of the Docker layer itself for genuine gaps, found by comparing
`api.Dockerfile`/`docker-compose.prod.yml` against their own documented
scope (Milestone 14's own explicit "unchanged by Milestone 14
(backend-only scope)" note on `web.Dockerfile` — a deliberate scope
boundary at the time, not something meant to stay open indefinitely).
**Not live-verified against a real `docker build`/`docker compose up`** —
no Docker daemon is available in this dev sandbox (same limitation
Module 6 already documented for verifying a Grafana/Prometheus stack);
every change below was validated by careful static review (YAML parsed
successfully, Dockerfile syntax cross-checked against `api.Dockerfile`'s
own already-working equivalent) instead.

- **`web.Dockerfile`** — added the same `HEALTHCHECK` (against `/`, the
  public marketing home page — not portal/auth-gated, see
  `apps/web/src/middleware.ts`) and non-root `antrique` user
  `api.Dockerfile` already had, closing the asymmetry the earlier
  milestone left open.
- **`docker-compose.prod.yml` — fixed a real credential bug, not just a
  hardening nice-to-have.** `POSTGRES_PASSWORD`/`POSTGRES_USER`/
  `POSTGRES_DB` were hardcoded to the literal `antrique`/`antrique`/
  `antrique`. Because Compose's `environment:` always overrides
  `env_file:` for the same key, the hardcoded `api.environment.DATABASE_URL`
  silently replaced whatever `apps/api/.env`'s own `DATABASE_URL` said —
  an operator who correctly set a strong `DATABASE_URL` in their real
  `.env` had it invisibly clobbered with a trivially guessable one by this
  compose file. Now `${POSTGRES_PASSWORD:?...}` (Compose's "required
  variable" interpolation) — the whole `docker compose` invocation fails
  immediately with a clear message if it's unset, rather than silently
  deploying with a guessable password. Read from a real root-level `.env`
  (see `.env.example`'s own new entries) — a DIFFERENT file from
  `apps/api/.env`; the override of `DATABASE_URL` itself stays intentional
  (`api` must always reach the `postgres` service by its Docker-network
  hostname).
- **`docker-compose.prod.yml` — `web` now gates on `api`'s healthcheck**
  (`depends_on: api: condition: service_healthy`), matching
  `postgres`/`redis`'s own already-established pattern in the same file.
  Deliberately NOT applied to the dev `docker-compose.yml` — that file's
  `docker-compose.override.yml` always switches `api` to the `dev` build
  target, which has no `HEALTHCHECK` at all (only `runtime` defines one),
  so this condition would hang forever there.
- **`docker-compose.prod.yml` — log rotation added to every service**
  (`json-file` driver, `max-size: 10m`, `max-file: 5`). Docker's default
  `json-file` driver has no size cap; this app already writes structured
  JSON logs to stdout on every request (`LoggingModule`), so an unbounded
  log file on a long-lived single-host deployment eventually fills the
  host disk.
- **`docker-compose.prod.yml` — resource limits added to every service**
  (`deploy.resources.limits.cpus`/`memory`). A starting point, not derived
  from real load-testing data on this deployment shape (none has been run
  — the load-testing work in `performance.md` is application-level, not
  container-level) — bounds the worst case (a leak/runaway process taking
  down the whole host) rather than tuning for throughput.

**Deliberately NOT done, and why:** `terraform/`/`k8s/`/`observability/`
remain placeholders — filling them in requires a real hosting-target
decision, a genuine infrastructure choice outside any code-only pass's
own scope (same reasoning Module 10's own CI/CD audit already applied to
`deploy-staging.yml`/`deploy-production.yml`'s placeholder push/rollout
steps). Redis authentication was considered and rejected for now:
nothing in this app actually opens a Redis connection yet (`REDIS_URL` is
only validated as a well-formed URL — see `ci.yml`'s own comment),
so securing a dependency not yet functionally wired to anything would be
speculative hardening, not a genuine current gap. `nginx.conf` remains
unwired into any compose file — already a deliberate, documented
placeholder for local single-origin routing, not something broken.

## 2. CI/CD (`.github/workflows/ci.yml`)

Full pipeline reference (every job, execution order, quality gates,
artifact retention): **`docs/architecture/cicd.md`** — not duplicated
here. Summary: `lint-typecheck-test-build` (baseline correctness, uploads
`api-dist`), `migration-validation` (real Postgres, catches a migration
that's syntactically valid but fails against real Postgres — the same
class of bug this project's Phase 1 audit found once already, see
`decisions.md`), `openapi-generation` (boots the real app, generates
`openapi.json`, see §"OpenAPI artifact generation" below),
`dependency-audit` (`pnpm audit` gated against a documented allowlist —
see `security.md` §15), `docker-build` (builds the `runtime` target +
Trivy container scan — see `container.md` §10), `release-artifacts`
(bundles the above into one archive — see `release.md` "Release
artifacts"). Every step in every job runs without `continue-on-error`/
`|| true` — a failure anywhere fails the workflow.

**Deferred, explicitly:** `deploy-staging.yml`/`deploy-production.yml`
(`workflow_dispatch`-only, `action: deploy | rollback`) build a real
Docker image and validate the deploy/rollback/health-verification pipeline
SHAPE, but every step past "the image exists" is a deliberate, clearly-
labeled placeholder — no registry or hosting target is provisioned yet
(`infrastructure/terraform/README.md` remains a scaffold). Wiring a real
deploy step is a genuine infrastructure decision (which registry, which
target) outside any code-only pass's own scope.

## 2a. OpenAPI artifact generation

New this pass (Engineering Polish). `apps/api/scripts/generate-openapi.ts`
boots the real `AppModule` (via `NestFactory.create()` — the same
bootstrap `main.ts` uses, minus `app.listen()`), applies the identical
routing topology (`src/bootstrap/api-routing.ts`) and Swagger document
config (`src/bootstrap/swagger-document.ts`) `main.ts` uses — both
extracted into shared modules specifically so there is exactly ONE
definition of each, imported by both the live-served copy and this
generator, never two independently-maintained copies that could drift.
Writes the result to `apps/api/openapi.json` (gitignored — never
hand-maintained or committed; regenerated fresh every CI run) and exits.
CI's `openapi-generation` job runs this against a throwaway Postgres and
uploads the result as the `openapi-spec` artifact — see `cicd.md` §11 for
where frontend developers should obtain it.

## 3. Request lifecycle (bootstrap order, `main.ts`)

1. Explicit body-size limit (`json()`/`urlencoded()`, `256kb` fixed
   literal — Milestone 13).
2. Helmet (security headers — Milestone 13).
3. Response compression (Milestone 12).
4. App config resolved (`appConfig` — port, CORS origins, version).
5. CORS (Milestone 13).
6. Global prefix (`/api`) + URI versioning (`/v1`), **excluding**
   `health/*` (Milestone 14 — see `health.controller.ts`'s own comment).
7. Swagger, if `swaggerCfg.enabled` (Milestone 14).
8. `HttpLoggingMiddleware` attached via raw `app.use()` — generates/reuses
   `X-Request-Id`/`X-Correlation-Id`, establishes the `RequestContext`
   every subsequent log call auto-merges, and (new this milestone) echoes
   both ids back as response headers.
9. Global `ValidationPipe`.
10. `ExceptionLoggingFilter` (registered via `APP_FILTER` in
    `app.module.ts`, not here).
11. `trust proxy` set, production only.
12. Explicit SIGTERM/SIGINT logging listeners registered, then
    `app.enableShutdownHooks()` (Milestone 14 — see "Shutdown sequence"
    below).
13. `app.listen(port)`.

Per-request, inside a guarded route: `ThrottlerGuard` (global, `APP_GUARD`)
→ `JwtAuthGuard` → `RolesGuard`/`PermissionsGuard` (per-route
`@UseGuards()`) → controller → service → repository → `PrismaService`.
Every log call anywhere in that chain — including `PrismaService`'s own
per-query logging and `AuditLoggerService`'s events — automatically carries
the same `requestId`/`correlationId` established in step 8, via
`RequestContextService`'s `AsyncLocalStorage` (built Phase 1.2C.4; this
milestone's own audit confirmed the propagation was already complete
end to end — the one piece actually missing was echoing the ids back to
the caller, added this milestone).

## 4. Startup lifecycle

`NestFactory.create()` resolves every module's `onModuleInit()` hooks
before `main.ts`'s own bootstrap code proceeds — in particular,
`PrismaService.onModuleInit()` runs a real `SELECT 1` (not just
`$connect()`, which a driver-adapter client can resolve successfully even
against an invalid connection string — see that file's own comment) and
throws, aborting startup, if the database isn't reachable. This means: by
the time `app.listen(port)` resolves and the process is accepting
connections, database connectivity has ALREADY been verified once — which
is exactly why `GET /health/startup` (Milestone 14) checks the database
again at request time rather than needing a separate one-time-flag
mechanism: there is no multi-step warm-up sequence in this app beyond what
Nest's own module-init ordering already guarantees. See
`health/health.service.ts`'s own comment for the full reasoning on why
`startup`/`ready` share logic but remain distinct endpoints.

Env validation happens even earlier — synchronously, while `ConfigModule`
is being evaluated at `require()` time, before `NestFactory.create()` is
even called. An invalid `.env` never reaches step 1 above at all (see
`docs/architecture/validation.md` §3 for the captured output of this
failure mode).

## 5. Shutdown sequence

1. SIGTERM or SIGINT received.
2. **New this milestone:** an explicit `process.on(signal, ...)` listener
   logs `"<signal> received — starting graceful shutdown..."` —
   additive to (never replacing) `enableShutdownHooks()`'s own internal
   handling; exists purely so a deploy log shows the signal was received
   before any `OnModuleDestroy` hook's own log line, giving an
   orchestrator's "sent SIGTERM" event something to correlate against.
3. `enableShutdownHooks()`'s own handling calls `app.close()`, which runs
   every module's `OnModuleDestroy`/`OnApplicationShutdown` hooks:
   - `PrismaService.onModuleDestroy()` — `$disconnect()`, draining the
     connection pool instead of dropping it mid-query; logs "Database
     connection closed."
   - `CacheService`/`InMemoryDeadLetterStore` — no cleanup hook needed
     (no timers to clear — both are lazily-expired/plain-array structures,
     confirmed by each class's own header comment).
4. Process exits.

In-flight HTTP requests: Node's own HTTP server (via Nest's underlying
Express adapter) stops accepting NEW connections once `app.close()` runs
but lets already-accepted requests complete before the process actually
exits — standard Node `server.close()` semantics, not custom-built by this
milestone. No separate request-draining logic was added; none was needed.

**A note on validating this on Windows:** Node's POSIX signal handling is
only partially emulated on Windows (this project's own dev environment) —
`SIGTERM`/`SIGINT` behave differently there than under the Linux runtime
every real deployment target (Docker/Kubernetes) actually uses. The
mechanism above (`enableShutdownHooks()` + `OnModuleDestroy` hooks) is
standard NestJS/Node, verified via the framework's own documented
behavior and this project's own live-boot testing of the individual
pieces (DB disconnect logging, health endpoints) — but a full
signal-to-clean-exit run was not exercised end to end in this dev
environment. Verify with a real `docker stop` (which sends SIGTERM) against
the `runtime` image before depending on this in a first real production
deploy.

## 6. API versioning strategy

Already real since Phase 1.2A — `VersioningType.URI`, `defaultVersion: '1'`
— every route resolves under `/api/v1/...` without any per-controller
`@Version()` needed. Confirmed unchanged, no gap found this milestone.
**Future version strategy:** when a route needs to diverge from `v1`, add
an explicit `@Version('2')` (or an array, for a route valid under both) on
that one controller/handler — `defaultVersion` continues to cover
everything else. `HealthController` is the first (and, as of this
milestone, only) exception: `version: VERSION_NEUTRAL`, deliberately
outside the versioning scheme entirely (see `health.controller.ts`'s own
comment) — infrastructure endpoints an orchestrator polls should not need
reconfiguring on every API version bump the business surface goes through.

## 7. Deployment topologies

- **Local dev:** `pnpm --filter @antrique/api dev`, or `docker compose up`
  (dev-shaped, hot-reload).
- **Single-host/VM:** `docker compose -f docker-compose.prod.yml up -d` —
  `postgres`/`redis` as sibling containers on the same host. Adequate for
  a small deployment; `postgres-data` is a named volume, not yet backed by
  any automated backup (see `release.md`'s "Backup strategy").
- **Managed containers + managed Postgres/Redis (the target-state
  `architecture.md` describes):** the `runtime` image is already
  container-registry-ready (non-root, `HEALTHCHECK`, minimal layers); what's
  still missing is the registry push step and the actual hosting target
  itself — `infrastructure/terraform/README.md`/`infrastructure/k8s/README.md`
  remain genuine placeholders, unchanged by this milestone (out of scope —
  provisioning real cloud infrastructure is a deployment/product decision,
  not a backend code change).

## 8. Live production topology (current, as of 2026-08-03)

This section documents what's actually deployed and serving real traffic
today — distinct from the topologies in §7, which describe what this repo's
own tooling builds toward. None of the below is provisioned via this
repo's IaC (still placeholders, see §7) — it was set up manually outside
version control, which is exactly why it needs to be written down here for
anyone resuming work later.

- **API** (`apps/api`): Render web service `antrique-api`, free tier,
  Singapore region, auto-deploys from GitHub `main`.
- **Web** (`apps/web`): Vercel project `antrique-web`, auto-deploys from the
  same `main` branch.
- **Postgres**: Supabase (`aws-0-ap-southeast-2.pooler.supabase.com`) — NOT
  Render's own managed Postgres. `apps/api/src/config/database/
  database.config.ts` uses `ssl: { rejectUnauthorized: false }` (not plain
  `ssl: true`) specifically because Node's default TLS validation rejects
  Supabase's cert chain — this is Prisma's own documented guidance for
  Supabase, still encrypted, just skips chain validation.
- **Storage**: Supabase Storage (S3-compatible), same project as Postgres.
- **Redis**: a managed instance separate from Render's own managed Redis —
  used for cache only (see `PROJECT_STATUS.md` §12).
- **Migrations**: Render's free tier has no pre-deploy hook, so `prisma
  migrate deploy` does **not** run automatically on push. Run it manually
  against the Supabase `DATABASE_URL` after any new migration lands on
  `main`.
- **Seeding**: `apps/api/prisma/seed.ts` is dev-only and must never run
  against this database. The one real production tenant row was created by
  hand via a one-off script.
- **Env vars in strict mode**: Turborepo 2's `envMode` is strict — any env
  var not declared in `turbo.json`'s `env`/`globalEnv`/`passThroughEnv`
  gets silently dropped from a task's `process.env`. `NEXT_PUBLIC_*` vars
  survive via Vercel's framework inference; anything else needed at Vercel
  build time must be listed explicitly in `turbo.json`'s `build` task `env`
  array.

See `PROJECT_STATUS.md` §6 for how this fits into overall deployment
status, and §7 (`Environment variables`) for the full var reference.
