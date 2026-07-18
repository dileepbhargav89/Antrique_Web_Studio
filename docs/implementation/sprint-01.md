# Sprint 1 — Foundation

**Goal:** stand up the skeleton everything builds on. Nothing user-facing ships.
**Milestone:** auth works, DB enforces tenant isolation, code deploys to staging.
**Design refs:** docs/architecture/{architecture,database,security}.md, CONTRIBUTING.md

## Status: 🟨 In progress

## Tasks
- [x] **Monorepo + tooling** (S) — confirm pnpm workspaces, Turbo, TS strict, lint/format run
  - depends on: nothing
- [x] **Database schema + migrations** (L) — tables from docs/architecture/database.md
  - depends on: tooling
- [x] **RLS policies** (part of above) — tenant_id isolation on every table
  - depends on: schema
- [ ] **Auth integration** (L) — managed IdP, JWT verify, sessions (HTTP-only cookie)
  - depends on: schema (users table)
- [ ] **RBAC model** (M) — roles, permissions, seed default roles
  - depends on: schema, auth
- [ ] **CI/CD pipeline** (M) — lint/typecheck/test/scan gates + staging deploy
  - depends on: tooling
- [ ] **Infra baseline** (L) — Terraform, one environment (staging)
  - depends on: nothing
- [x] **Shared types + OpenAPI skeleton** (M) — packages/shared, api-contract
  - depends on: tooling

## Definition of done (every task)
- Tests written and passing
- Follows CONTRIBUTING.md
- Tenant isolation test passes (for data tasks)
- Merged via reviewed PR, green CI

## Exit check
Can a developer authenticate, and does a query for tenant A never return tenant B's rows?
