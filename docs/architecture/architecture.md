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
