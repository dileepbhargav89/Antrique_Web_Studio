# Container Guide

New this pass (Engineering Polish — pre-Backend-v1.0-review). The dedicated
Docker reference for `apps/api`; `deployment.md` §1 has the short version
and how Docker fits into the bigger deployment picture — this doc is the
detail: build, compose, env vars, versioning, health, lifecycle,
troubleshooting, production recommendations, and container security
scanning.

## 1. Docker build

`infrastructure/docker/api.Dockerfile`, four stages:

```
base → deps → dev            (docker-compose.override.yml, hot-reload)
            → build → runtime (what actually ships)
```

Build from the **monorepo root** (the Dockerfile's own COPY paths assume
it):

```bash
docker build \
  -f infrastructure/docker/api.Dockerfile \
  --target runtime \
  --build-arg APP_VERSION=$(git describe --tags --always) \
  --build-arg GIT_COMMIT_SHA=$(git rev-parse HEAD) \
  -t antrique-api:local .
```

`deps` only `COPY`s manifests (every `package.json` + the lockfile) before
`pnpm install` — a source-only change never busts that layer's cache.
`build` compiles (`pnpm --filter @antrique/api build`) and produces a
production-only `node_modules` via `pnpm deploy --prod /out` (dev
dependencies never reach the image). `runtime` copies ONLY `dist/`,
that production `node_modules`, and `package.json` — no compiler, no
TypeScript source, no dev tooling ships. Runs as a non-root user
(`antrique`, fixed uid/gid 1001).

## 2. Docker Compose

- `docker compose up api` — dev-shaped (`docker-compose.yml` +
  `docker-compose.override.yml`, auto-merged): `dev`-stage image,
  hot-reload via a source bind-mount, `postgres`/`redis` ports exposed to
  the host for local `psql`/`redis-cli` access.
- `docker compose -f docker-compose.prod.yml up -d api` — production-
  shaped: `runtime`-stage image, no host-exposed DB/Redis ports,
  `restart: unless-stopped`, `env_file` required (a production deployment
  with no real config is a startup failure, not a fallback).

Both compose files build `infrastructure/docker/api.Dockerfile`; only the
`target` and `command`/volumes differ.

## 3. Environment variables

Full reference: `docs/architecture/environment.md`. The container-specific
subset: `DATABASE_URL`/`REDIS_URL` are overridden by both compose files to
point at the sibling `postgres`/`redis` services (`postgres:5432`,
`redis:6379` — Docker's own internal DNS, not `localhost`); every other
required variable (JWT secrets, `DEFAULT_TENANT_ID`) must come from
`apps/api/.env` (dev compose, `required: false` — falls back to
whatever's baked into the image/shell env if absent) or is REQUIRED
(prod compose, `required: true` — the container refuses to start
meaningfully without it, matching `env.validation.ts`'s own fail-fast
design).

## 4. Image versioning

`APP_VERSION`/`GIT_COMMIT_SHA` build `ARG`s (see `api.Dockerfile`'s own
header comment) — baked into the image as `ENV`, read by
`env.validation.ts`, surfaced via `GET /runtime`. Not introspected from
`package.json` at runtime — see `environment.md` "Runtime version
stamping" for the full reasoning. Image TAGS themselves
(`antrique-api:ci`, `antrique-api:staging-<sha>`, etc.) are a separate
concern from this baked-in metadata — see `release.md` "Release tagging
strategy."

## 5. Health checks

`HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3`
against `GET /health/live` via a Node one-liner (no `curl`/`wget`
installed in this minimal Alpine image — adding either just for this
would grow it for no other benefit). `docker ps`/`docker inspect` report
`healthy`/`unhealthy` based on this; a compose file's own `depends_on:
condition: service_healthy` (used for `postgres`/`redis` in both compose
files here) can gate on it the same way. See `runbook.md` §1 for using
`/health/live` vs. `/health/ready`/`/health/startup` operationally — the
Docker `HEALTHCHECK` deliberately uses the cheapest one (`live`, no
dependency check) since it exists to answer "is the process itself still
responsive," the same question a container runtime asks before deciding
whether to restart it.

## 6. Startup

See `deployment.md` §4 for the full lifecycle. Container-relevant
summary: `NestFactory.create()` runs every module's `onModuleInit()` —
including `PrismaService`'s real `SELECT 1` — before the process starts
listening. A container that can't reach its configured `DATABASE_URL`
exits non-zero at startup rather than starting and serving broken
requests; check `docker logs` for `"Database connection failed"` in that
case, not the health endpoint (the container never gets far enough to
serve it).

## 7. Shutdown

See `deployment.md` §5 for the full sequence. `docker stop` sends
SIGTERM by default (a 10-second grace period before `docker`'s own
SIGKILL) — this app's explicit `process.on('SIGTERM', ...)` logs receipt
immediately, then `enableShutdownHooks()`'s own handling drains the
Prisma connection pool before the process exits. `docker stop -t <seconds>`
extends the grace period if a deployment ever needs longer than 10s to
drain in-flight requests (not currently needed at this app's request
volumes, but a real, available knob).

## 8. Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| Container exits immediately, no HTTP ever served | Invalid/missing required env var | `docker logs` — `env.validation.ts` prints every violation in one formatted error before anything else runs |
| Container exits immediately, env looks fine | Database unreachable | `docker logs` for `"Database connection failed"`; confirm `DATABASE_URL` resolves from INSIDE the container's own network (`postgres`, not `localhost`, under Compose) |
| Container runs, `docker ps` shows `unhealthy` | `/health/live` failing — see `runbook.md` §1 | `docker logs`; if the process itself looks fine, check `docker exec` into the container and curl `localhost:4000/health/live` directly |
| `docker build` fails at the `build` stage | A real lint/typecheck/test failure — the image build runs the same `pnpm build` a local build would | Run `pnpm --filter @antrique/api build` locally first; the Docker build isn't doing anything CI's own `lint-typecheck-test-build` job wouldn't already have caught |
| Image builds, but `CMD` fails immediately with `Cannot find module` | `dist/` layout mismatch — see `deployment.md` §1 "Fixed this milestone" for the exact historical instance of this class of bug | Confirm `CMD` matches the real compiled entry point (`dist/src/main.js`, not `dist/main.js` — `tsconfig.json`'s multi-root `include` is why) |
| Swagger/`/api/docs` reachable in a production container when it shouldn't be | `SWAGGER_ENABLED=true` without noticing, or `SWAGGER_ALLOW_IN_PRODUCTION=true` set deliberately but forgotten | Check both env vars — `environment.md` "Swagger in production" |

## 9. Production recommendations

- Always deploy the `runtime` target, never `dev`/`build` — `dev` mounts
  source and runs framework watch mode (never intended to be reachable
  from outside a local machine); `build` still contains the compiler and
  full `node_modules`, unnecessarily large and unnecessarily exposed
  attack surface (dev tooling in a running container).
- Set real `APP_VERSION`/`GIT_COMMIT_SHA` build args — see §4. An image
  built without them defaults to an obviously-placeholder value
  (`0.0.0-unknown`/`unknown`), which is safe (never silently wrong) but
  makes `GET /runtime` useless for confirming what's actually deployed.
- Run behind a reverse proxy/load balancer that terminates TLS — this
  process never does (see `deployment.md` §3, `trust proxy` note) and
  has no TLS-serving code path at all.
- Use `docker-compose.prod.yml` as the starting shape for a single-host
  deployment, not the default root `docker-compose.yml` (dev-oriented —
  see §2). For anything beyond a single host, the `runtime` image itself
  is already registry-ready (non-root, `HEALTHCHECK`, minimal layers);
  what's still missing is the registry/hosting target itself — see
  `deployment.md` §7 "Deployment topologies."
- Scan every built image before deploying it — see "Container security
  scanning" below. Not yet automated against a REAL deploy target (only
  against CI's own build of `main`); wire the same Trivy gate into
  `deploy-staging.yml`/`deploy-production.yml`'s own Docker build step
  once those stop being placeholders (`deployment.md` §2).

## 10. Container security scanning

New this pass. `.github/workflows/ci.yml`'s `docker-build` job runs
[Trivy](https://github.com/aquasecurity/trivy) (via
`aquasecurity/trivy-action`) against the actual built `runtime` image —
both OS packages (Alpine) and application dependencies (the same
`node_modules` the image ships). Two passes, deliberately: a full report
(every severity, `exit-code: 0`, pure visibility) and a gating pass
(`CRITICAL,HIGH` only, `exit-code: 1`, fails the build). LOW/MEDIUM/INFO
findings are visible in the full report but never fail CI — "Fail only on
HIGH and CRITICAL... Ignore LOW and INFO" is about what GATES the build,
not about hiding lower-severity findings from anyone reading the log.

**Accepted risk handling:** `.trivyignore` (repo root) is the allowlist —
one CVE/GHSA id per line, each with a comment explaining why it's
accepted, following the exact same reachability-first discipline
`apps/api/audit-allowlist.json` already applies to `pnpm audit` findings
(see `security.md` §11/§14/§15). **Currently empty** — no real Trivy scan
has run against a real build in this development environment (Docker
itself isn't available here; see `deployment.md`'s own note on this
limitation). The first real CI run against `main` is what will surface
anything that needs triage — do not pre-populate this file with guessed
entries.
