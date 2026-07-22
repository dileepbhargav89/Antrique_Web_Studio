# Production Architecture

## Governing decisions
1. **Two workloads, one platform** — cacheable SSG/ISR marketing site +
   authenticated SSR/SPA portal sharing one backend, auth, database.
2. **Modular monolith on managed services** — not microservices/self-hosting.
   Clean seams to extract services later.
3. **Named tech = defaults; category = requirement.** India-first, lean team.

## Layers
- **Frontend:** Next.js + TypeScript + Tailwind. Per-route rendering: SSG/ISR
  (SEO marketing) + SSR/CSR (portal). TanStack Query for server-state.
- **Backend:** modular monolith (Node/TS, NestJS-style). Modules: auth, projects,
  billing, crm, notifications, content + cross-cutting common layer. REST+OpenAPI.
  Queue+workers for async.
- **Database:** PostgreSQL (relational, ACID billing, JSONB, RLS multi-tenancy) +
  Redis (cache/sessions/queue/rate-limit). Managed, PITR backups.
- **Auth:** managed IdP, OIDC, short JWT + rotating refresh, RBAC, SSO/SAML for
  enterprise, step-up for sensitive actions.
- **Hosting/CDN:** edge/static for marketing, managed containers for portal,
  India region, global CDN (also WAF/DDoS). Terraform IaC.
- **Caching:** layered (CDN, ISR, Redis, HTTP ETag, browser). Private data NEVER
  shared-cached.
- **Payments:** hosted PCI gateway (Razorpay/Stripe). Card data never touches our
  servers; webhook-driven, signature-verified, idempotent.
- **Observability:** structured logs + metrics + OpenTelemetry tracing + Sentry +
  uptime/synthetic + RUM.
- **CI/CD:** PR gates → staging → canary → blue-green, instant rollback, feature
  flags. Expand-then-contract migrations.
- **Docs:** OpenAPI, ADRs, runbooks, Storybook.

## Status vs. this document (Milestone 14 — Production Infrastructure)

This document describes the target-state design; `apps/api` is the only
workload with real code as of Milestone 14. Real, as of this milestone:
containerized (`infrastructure/docker/api.Dockerfile`, non-root,
multi-stage), CI-gated (`.github/workflows/ci.yml` — lint/typecheck/test/
build/format, migration validation against a real database, a Docker
build check), self-documenting (OpenAPI/Swagger, gated outside
development), health-check-observable (`GET /health/{live,ready,startup}`),
and structured-log-observable end to end with caller-visible correlation
ids. **Not yet real:** the CDN/edge/WAF layer, Terraform IaC, managed
container hosting, the queue/workers layer (background job infrastructure
exists — `apps/api/src/jobs/` — but nothing runs on it, no Redis/BullMQ),
`apps/web`'s own production hardening (out of this milestone's backend-only
scope), and the full CI/CD pipeline described above (`staging → canary →
blue-green`) — `deploy-staging.yml`/`deploy-production.yml` remain
manual-trigger-only, stopping short of an actual deploy step, pending a
real hosting target. See `docs/architecture/deployment.md` for what's
actually real today.
