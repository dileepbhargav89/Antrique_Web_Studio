# Antrique Web Studio

Full-service web agency platform. Hybrid: SEO marketing site + client portal +
internal admin console. Monorepo (pnpm workspaces + Turbo).

## Build / test / lint  (update once package.json scripts are real)
- install: `pnpm install`
- dev: `pnpm dev`
- test: `pnpm test`
- lint: `pnpm lint`
- typecheck: `pnpm typecheck`

## Architecture (one line each — detail in docs/architecture/)
- Next.js frontend: marketing = SSG/ISR (indexed), portal = SSR (auth). Never cross-import.
- Modular-monolith backend (apps/api): modules auth/projects/billing/crm/notifications/content.
- PostgreSQL + RLS multi-tenancy (tenant_id spine), Redis cache/queue, managed IdP auth.

## Non-negotiable rules
- Follow CONTRIBUTING.md — it is the engineering standard.
- Tenant scope on EVERY query; RLS is the backstop, not the only gate.
- API conforms to packages/api-contract/openapi/openapi.yaml (authoritative).
- Never handle raw card/credential data; payments via hosted gateway; never auto-submit for a user.
- Every feature ships with tests + WCAG AA accessibility + audit logging.

## Where things live
- Design decisions: docs/product/
- Architecture: docs/architecture/{architecture,database,api,security,seo,optimization}.md
- Design tokens: apps/web/src/styles/tokens (tokens.css, components.css)
- BUILD STATUS + what to do next: docs/implementation/ (progress.md is the dashboard)

## Working rules for Claude
- Start each session by reading docs/implementation/progress.md and the current sprint file.
- Plan before editing. Work ONE task at a time, scoped. Read the design doc for that task first.
- After a task: check it off in the sprint file, update progress.md, log any decision/blocker.