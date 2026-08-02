# Antrique Web Studio

Full-service web agency platform — a hybrid SEO marketing site, client portal,
and internal admin console, in one pnpm/Turborepo monorepo.

> **Development is FROZEN as of 2026-08-03.** Start here:
> **[`PROJECT_STATUS.md`](PROJECT_STATUS.md)** (what's built, what's not,
> known issues, environment/services), **[`NEXT_STEPS.md`](NEXT_STEPS.md)**
> (prioritized roadmap for resuming), **[`RESUME_DEVELOPMENT.md`](RESUME_DEVELOPMENT.md)**
> (setup from scratch). See also `RELEASE_NOTES_v1.1.0.md` and
> `CHANGELOG.md`.

Status: both `apps/api` (backend, API-frozen since Backend v1.0) **and**
`apps/web` (frontend — marketing site, auth, full business portal, Projects
workspace) are built and live in production. See `PROJECT_STATUS.md` for
exactly what's complete vs. partial vs. not started —  do not rely on this
file's own status line staying current; `docs/implementation/progress.md`
remains the full historical build log underneath `PROJECT_STATUS.md`.

## Stack

- **Frontend** (`apps/web`): Next.js + TypeScript + Tailwind. SSG/ISR for the
  indexed marketing site, SSR for the authenticated portal (dashboard,
  catalog, bespoke customizer, orders, inventory, CRM, billing, admin,
  Projects workspace) — see `apps/web/README.md`.
- **Backend** (`apps/api`): NestJS modular monolith. Real modules: auth,
  catalog, bespoke (customizer), inventory, orders, crm, billing, admin
  (analytics/notifications/audit/runtime), projects, prompts + 6 AI
  Workspace features (backend-only, no UI yet), finance (Vendor Management
  only so far) — see `apps/api/README.md` for the full structure. `content`
  remains scaffold-only (never built).
- **Data:** PostgreSQL (RLS multi-tenancy) + Redis (cache; no queue/worker
  topology yet). Production: Supabase Postgres + Storage, managed Redis.
- **Contract:** `apps/api/openapi.json` (CI-generated, always current — see
  `apps/api/README.md`) or the live `GET /api/docs` Swagger UI is the real
  source of truth. `packages/api-contract` is a pre-implementation design
  draft, superseded — see that package's own README before using it.

Full architecture: `docs/architecture/architecture.md`. Design decisions:
`docs/product/`. Live deployment topology: `docs/architecture/deployment.md`
§8.

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- pnpm 9 (`npm install -g pnpm@9.15.9`, or `corepack enable` if it works on
  your platform)
- Docker + Docker Compose, for Postgres/Redis and containerized runs

## Getting started

```bash
pnpm install

# copy env templates and fill in local values
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# start Postgres + Redis (+ api/web in watch mode)
docker compose up

# or run the apps directly on the host instead of in containers
pnpm dev
```

## Scripts

Run from the repo root; Turborepo fans these out to every workspace.

| Script | What it does |
|---|---|
| `pnpm dev` | Start all apps in watch mode |
| `pnpm build` | Production build, every workspace |
| `pnpm lint` | ESLint, every workspace |
| `pnpm typecheck` | `tsc --noEmit`, every workspace |
| `pnpm test` | Test suites, every workspace |
| `pnpm format` / `format:check` | Prettier write / check |
| `pnpm clean` | Remove build output (`dist`, `.next`, coverage) |

## Repository layout

```
apps/api/               NestJS backend
apps/web/                Next.js frontend (marketing + portal)
packages/shared/          Shared types/validation (front + back)
packages/api-contract/    OpenAPI contract draft (superseded — see its own README)
packages/config/          Shared eslint/tsconfig/tailwind config
infrastructure/            Docker, Terraform, k8s, observability
docs/                      Product, architecture, and build-tracking docs
PROJECT_STATUS.md           Current-state snapshot (start here)
NEXT_STEPS.md                Prioritized roadmap for resuming development
RESUME_DEVELOPMENT.md         Setup-from-scratch guide
```

Note: the old `database/` directory (pre-Prisma Sprint-1 scaffold) has been
removed — real schema/migrations/RLS live under `apps/api/prisma/`.

## Engineering standards

All contributions follow `CONTRIBUTING.md` — naming, git workflow, testing,
accessibility (WCAG 2.1 AA), and security rules are enforced there, not just
documented.

## DevContainer

`.devcontainer/` provides a ready-to-use VS Code / GitHub Codespaces
environment with Node, pnpm, and the recommended extensions preinstalled.
