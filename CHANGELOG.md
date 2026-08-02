# Changelog

All notable changes to this project. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). See `RELEASE_NOTES_v1.1.0.md`
for the narrative version of the `1.1.0` entry, and `PROJECT_STATUS.md` for
the full current-state snapshot.

## [1.1.0] — 2026-08-03 (development freeze point)

### Added
- Full `apps/web` Next.js frontend: 15-page marketing site, authentication
  UI, and business portal covering catalog, bespoke customizer, orders,
  inventory, CRM, billing, and admin.
- CRM: real lead capture from contact/quote forms, quotation letterhead
  PDFs, payment-stage schedules, tenant branding settings.
- Projects module (Phase 7): Project/Milestone/Task/Document/Comment,
  backend + full `apps/web` workspace.
- AI Workspace backend (Phase 8): Proposal Generator, Requirement
  Analyzer, Project Estimator, Task Generator, Content Assistant, Email
  Assistant, multi-provider AI abstraction, prompt template library. No
  frontend UI yet.
- Finance module (Phase 9), Step 1: Vendor Management.
- Production hardening (Phase 10, modules 1–11): session-backed auth with
  rotation/reuse-detection/lockout, Redis-backed caching, Prometheus
  metrics, structured logging with tenant/user context, scheduled
  session-cleanup job, DB statement timeouts + transaction retry, CI
  hardening, Docker/infra fixes.
- Real production deployment: Render (API) + Vercel (web) + Supabase
  (Postgres + Storage).
- Vitest unit + Playwright e2e testing infrastructure (web), live Postgres
  RLS tenant-isolation integration test (api).
- Sentry error tracking (api + web).

### Fixed
- TLS chain validation for managed Postgres (Supabase) SSL connections.
- Prisma client generator config (`moduleFormat: cjs`,
  `importFileExtension: js`) — fixed `MODULE_NOT_FOUND` crash on Linux
  builds.
- `docker-compose.prod.yml` credential-clobbering bug (hardcoded
  `DATABASE_URL` silently overriding a real one).
- Turborepo strict env-mode dropping server-only env vars from builds.

### Known limitations
- Refunds (`POST /payments/:id/refund`) return a deliberate 501 — no
  payment gateway is integrated yet.
- No UI exists for any Phase 8 AI Workspace feature.
- Finance Steps 2–7 and 14 further Phase 9 modules are unstarted.

Full detail: `PROJECT_STATUS.md`. Full commit list:
`git log v1.0.0..v1.1.0 --oneline`.

## [1.0.0] — 2026-07-23

### Added
- `apps/api` backend v1.0: complete, tested, API-frozen modular monolith.
  Modules: auth (RBAC + multi-tenancy), catalog, bespoke, inventory,
  orders, crm, billing, admin (analytics/notifications/audit/runtime).
- PostgreSQL with row-level-security multi-tenancy, Redis cache/queue
  config, containerized runtime (Docker), CI pipeline.
- No frontend (`apps/web`) existed yet at this tag — see `1.1.0` above.
