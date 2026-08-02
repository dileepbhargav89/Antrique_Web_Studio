# Backend — modular monolith (NestJS-style modules over one deployable)

REST API for the Antrique platform. Auth/RBAC/multi-tenancy, six real
business modules (Catalog, Bespoke, Inventory, Orders, CRM, Billing) plus
Admin (analytics/notifications/audit/runtime), hardened (Milestone 13) and
production-infrastructure-complete (Milestone 14 — "this milestone
completes the backend"), and API-frozen as of Backend v1.0 Review Phase 3.

**Since v1.0.0 (see repo-root `PROJECT_STATUS.md` for the full picture):**
`projects` (Project/Milestone/Task/Document/Comment, Phase 7), `prompts` +
six AI Workspace feature modules — proposal-generator, requirement-analyzer,
project-estimator, task-generator, content-assistant, email-assistant
(Phase 8, backend-only, no `apps/web` UI yet), and `finance` (Vendor
Management only so far, Phase 9 Step 1) were added. `content` remains a
README-only scaffold, never built.
See `docs/architecture/{architecture,backend,database,security,deployment,
performance}.md` for the full design. The authoritative API contract is
this implementation's own self-description — `openapi.json` (CI-generated
via `pnpm generate:openapi`, see below) and the live `GET /api/docs`
Swagger UI, both produced from the real running code so neither can drift
from it. `packages/api-contract/openapi/openapi.yaml` is a pre-
implementation design draft from before this backend was built and is
NOT current — see that package's own README for specifics before using it.

## Run

```bash
cp .env.example .env   # from the repo root: apps/api/.env.example
pnpm --filter @antrique/api dev      # watch mode, http://localhost:4000
pnpm --filter @antrique/api build    # production build -> dist/
pnpm --filter @antrique/api start    # run the production build
pnpm --filter @antrique/api test     # jest
pnpm --filter @antrique/api lint
pnpm --filter @antrique/api typecheck
```

Or via Docker Compose from the repo root:
- `docker compose up api` — dev-shaped (hot-reload, host-exposed
  postgres/redis).
- `docker compose -f docker-compose.prod.yml up -d api` — production-
  shaped (see `docs/architecture/deployment.md`).

## Health / docs

- `GET /health/live` — process alive, no dependency check.
- `GET /health/ready` / `GET /health/startup` — checks real database
  connectivity, `503` if unreachable.
- `GET /api/docs` — Swagger UI (`SWAGGER_ENABLED`, on by default in
  development; requires a deliberate second opt-in in production — see
  `docs/architecture/environment.md`).
- `GET /api/v1/runtime` — version/uptime/environment/DB health (Admin/
  Super Admin only) — unlike the three health-check routes above, this one
  goes through the normal versioned `/api/v1` prefix and requires auth.

See `docs/architecture/runbook.md` for using these operationally.

## OpenAPI artifact / dependency audit (CI-generated)

```bash
pnpm --filter @antrique/api generate:openapi   # writes openapi.json (needs a reachable Postgres)
pnpm --filter @antrique/api audit:check        # pnpm audit, gated against audit-allowlist.json
```

`openapi.json` is never hand-maintained or committed — CI regenerates it
on every run and uploads it as an artifact (see
`docs/architecture/cicd.md` §11 for where to download it). See
`docs/architecture/{deployment,container,cicd}.md` for the full
Docker/CI/CD reference.

## Structure

```
src/
  main.ts            Bootstrap: security headers, CORS, Swagger, versioning,
                      shutdown hooks, listen.
  app.module.ts       Root module
  modules/            auth, catalog, bespoke, inventory, orders, crm,
                      billing, admin (real); projects, content (not yet built)
  common/             Cross-cutting (guards, filters, interceptors, pipes)
  authorization/      RBAC (roles/permissions resolution)
  tenant/             Multi-tenant resolution middleware
  health/             GET /health/{live,ready,startup}
  jobs/               Background job infrastructure (Job/JobRunner/retry/
                       dead-letter) — infrastructure only, no real jobs yet
  cache/              In-process TTL cache (no Redis)
  logging/            Structured logging, audit logging, request context
tests/
```

See each `modules/*/README.md` for what's real vs. still scaffold.
