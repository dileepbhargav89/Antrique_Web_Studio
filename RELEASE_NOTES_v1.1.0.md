# Release Notes — Version 1.0 platform milestone (tag: v1.1.0)

**Date: 2026-08-03.** This is the release that represents the platform's
first real "v1.0" — a usable marketing site + client portal + admin
console, not just the API. It's tagged `v1.1.0` rather than reusing
`v1.0.0` because that tag (2026-07-23) covered `apps/api` only; the 44
commits since then (below) are all real, shipped functionality with no
breaking changes to the frozen API contract, which is exactly what a
semver minor bump means. See "Suggested tag" at the bottom for the exact
command — it hasn't been created yet.

This release is also the **development freeze point** — see
`PROJECT_STATUS.md` for the full state snapshot and `NEXT_STEPS.md` for
what's queued next.

## Highlights

- **The frontend now exists.** As of `v1.0.0`, `apps/api` was complete but
  there was no usable application. This release adds the entire
  `apps/web` Next.js app: a 15-page indexed marketing site, authentication
  UI, and a full business portal covering all 7 original backend modules
  (catalog, bespoke customizer, orders, inventory, CRM, billing, admin).
- **CRM went from "built" to "polished."** Real lead capture from the
  contact/quote forms, quotation letterhead PDFs, payment-stage schedules,
  and tenant branding settings. This is the most end-to-end-verified
  module in the platform today.
- **Projects/Milestones/Tasks (Phase 7)** — a genuinely new module:
  Project/Milestone/Task/Document/Comment, both backend and a full
  `apps/web` workspace (list + detail with Kanban/Files/Activity tabs).
- **AI Workspace backend (Phase 8)** — six AI-powered features (Proposal
  Generator, Requirement Analyzer, Project Estimator, Task Generator,
  Content Assistant, Email Assistant), a multi-provider abstraction
  (Anthropic live-verified; OpenAI/Gemini/OpenRouter built but untested),
  and a prompt template library. **No `apps/web` UI ships for any of this
  yet** — backend-only in this release.
- **Finance module started (Phase 9)** — Vendor Management only; the rest
  of the planned Finance module (Purchase Orders, Expenses, Invoicing,
  Refunds, Tax, Revenue Dashboard) is scoped but not built.
- **Production hardening (Phase 10, modules 1–11 of 15)** — real
  session-backed auth with rotation/reuse-detection/lockout, Redis-backed
  caching, Prometheus metrics, structured logging with tenant/user
  context, a scheduled session-cleanup job, DB statement timeouts +
  transaction retry, CI hardening (job timeouts, least-privilege
  permissions, CodeQL), and Docker/infra fixes (credential-clobbering bug,
  Prisma/TLS fixes for managed Postgres).
- **Real production deployment stood up**: Render (API) + Vercel (web) +
  Supabase (Postgres + Storage), previously undocumented in-repo — now
  captured in `docs/architecture/deployment.md` §8.

## What's explicitly NOT in this release

- Payment gateway integration — refunds return a documented 501, no card
  processing exists.
- Managed IdP/SSO — auth is local JWT/password only.
- Any UI for the Phase 8 AI features.
- Finance Steps 2–7, and all 14 other planned Phase 9 modules.
- Phase 10 modules 12–15 (Testing, Docs, Tech debt, Readiness report).

Full detail on all of the above: `PROJECT_STATUS.md`.

## Notable fixes bundled into this release

- TLS chain validation relaxed for managed Postgres (Supabase) SSL
  connections — was breaking every real DB connection outside local
  Docker.
- Prisma client generator config fixes (`moduleFormat: cjs`,
  `importFileExtension: js`) — compiled output was crashing with
  `MODULE_NOT_FOUND` on Linux build environments.
- `docker-compose.prod.yml` credential-clobbering bug — a hardcoded
  `DATABASE_URL` was silently overriding a real, correctly-set one.
- Turborepo strict env-mode fix — server-only env vars were being silently
  dropped from Vercel builds.

## Fully commit list (`v1.0.0..v1.1.0`)

See `git log v1.0.0..v1.1.0 --oneline` for the raw 44-commit list this
release note summarizes; also logged in `CHANGELOG.md`.

## Suggested tag

`v1.0.0` already exists and covers backend-only. Tag the current `HEAD` as
the platform's first full-stack release:

```bash
git tag -a v1.1.0 -m "Full-stack v1.0 platform milestone: frontend, CRM polish, Projects, AI Workspace backend, Finance Step 1, Phase 10 hardening modules 1-11. Development freeze point."
git push origin v1.1.0
```

Not run as part of this freeze pass — left for the user to create and push
when ready.
