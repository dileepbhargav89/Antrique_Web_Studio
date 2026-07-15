# Antrique Web Studio

Full-service web agency platform — a hybrid SEO marketing site, client portal,
and internal admin console, in one pnpm/Turborepo monorepo.

Status: **Phase 0 — repository foundation.** Tooling, CI, and containerization
are set up and verified; application features have not been built yet. See
`docs/implementation/progress.md` for the build dashboard.

## Stack

- **Frontend** (`apps/web`): Next.js + TypeScript + Tailwind. SSG/ISR for the
  indexed marketing site, SSR for the authenticated portal.
- **Backend** (`apps/api`): NestJS modular monolith. Modules: auth, projects,
  billing, crm, notifications, content.
- **Data:** PostgreSQL (RLS multi-tenancy) + Redis (cache/queue/rate-limit).
- **Contract:** `packages/api-contract` — OpenAPI 3.1, the source of truth for
  every endpoint.

Full architecture: `docs/architecture/architecture.md`. Design decisions:
`docs/product/`.

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
apps/api/            NestJS backend
apps/web/             Next.js frontend (marketing + portal)
packages/shared/       Shared types/validation (front + back)
packages/api-contract/ OpenAPI contract (authoritative)
packages/config/       Shared eslint/tsconfig/tailwind config
database/               Schema, migrations, RLS policies
infrastructure/         Docker, Terraform, k8s, observability
docs/                   Product, architecture, and build-tracking docs
```

## Engineering standards

All contributions follow `CONTRIBUTING.md` — naming, git workflow, testing,
accessibility (WCAG 2.1 AA), and security rules are enforced there, not just
documented.

## DevContainer

`.devcontainer/` provides a ready-to-use VS Code / GitHub Codespaces
environment with Node, pnpm, and the recommended extensions preinstalled.
