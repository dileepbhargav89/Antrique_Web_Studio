# Backend — modular monolith (NestJS-style modules over one deployable)

REST API for the Antrique platform. See `docs/architecture/{architecture,database,api,security}.md`
for the design; `packages/api-contract/openapi/openapi.yaml` is the
authoritative contract.

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

Or via Docker Compose from the repo root: `docker compose up api`.

## Structure

```
src/
  main.ts          Bootstrap
  app.module.ts     Root module
  modules/          auth, projects, billing, crm, notifications, content
  common/           Cross-cutting (guards, filters, interceptors, pipes)
  jobs/             Queue/worker processors
tests/
```

Modules are currently empty scaffolds (see each `modules/*/README.md`) —
feature work has not started; this app only has its framework bootstrap so
far.
