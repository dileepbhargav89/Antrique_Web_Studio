# Project Status — Antrique Platform

**Snapshot date: 2026-08-03. Development is FROZEN as of this date** (the
user's decision — pausing to start another project, resuming later). This
file is the entry point for a future session/developer picking this back
up. It supersedes the "Current status" summary line at the top of
`docs/implementation/progress.md` as the fastest way to get oriented —
`progress.md` remains the full historical build log underneath it.

Read this file first, then `NEXT_STEPS.md` (what to do next) and
`RESUME_DEVELOPMENT.md` (how to get the project running again).

---

## 1. Completed modules

**Backend (`apps/api`)** — controller/service/Prisma-repository triads, real
tests, wired into `app.module.ts`:

| Module | What it does |
|---|---|
| `auth` | Login/refresh/logout, session-backed refresh rotation + reuse detection, account lockout, concurrent-session limits, JWT `jti` |
| `catalog` | Product catalog + product image upload |
| `bespoke` | Order-creation customizer wizard |
| `inventory` | Stock, warehouses, suppliers, transactions |
| `orders` | Order lifecycle |
| `crm` | Leads, follow-ups, customer notes/activity, quotations (incl. letterhead PDF + payment-stage schedules) — the most end-to-end-verified module in the platform |
| `billing` | Invoices, payments (refunds are a documented exception — see §4) |
| `admin` | Dashboard analytics, notifications, audit logs, reports, tenant branding settings |
| `projects` | Project/Milestone/Task/Document/Comment (Phase 7) |
| `prompts` | Prompt template library (Phase 8 foundation) |
| `proposal-generator`, `requirement-analyzer`, `project-estimator`, `task-generator`, `content-assistant`, `email-assistant` | Phase 8 AI Workspace — all backend-complete (see §2 for the UI gap) |
| `contact`, `newsletter` | Marketing site lead capture, wired to real transactional email |

**Frontend (`apps/web`)**:
- Marketing site — 15 real pages (Home, Services, Industries, Work,
  About+Process, Pricing, Resources, Blog listing+detail, FAQ, Contact,
  Quote, Privacy, Terms).
- Auth UI, full application shell/navigation.
- Business Portal — dashboard, catalog, bespoke customizer, orders,
  inventory, CRM, billing, admin (dashboard/notifications/audit-logs/
  reports/settings) — all 7 original Backend v1.0 modules.
- Projects workspace (list + detail: Milestones/Tasks list+Kanban/Files/
  Activity tabs) — Phase 7.
- Finance Vendor Management UI (list + detail) — Phase 9 Step 1, the only
  Finance UI built so far.
- Floating WhatsApp/call-support widget, custom vector logo + wordmark.

**Infrastructure (Phase 10, modules 1–11 of 15)**: API performance,
frontend performance, security hardening, auth/session security,
observability (structured logs, tenant/user context, redaction), monitoring
(`GET /metrics` via prom-client), background jobs (in-process `@Cron()`
scheduler), caching (Redis-backed), DB reliability, CI/CD, Docker/infra
hardening.

## 2. Partially completed modules

- **`finance`** — only Step 1 (Vendor Management) is built. Steps 2–7
  (Purchase Orders, Expenses, Invoice PDF/email, Refunds, Tax/GST
  Configuration, Revenue Dashboard) are specced in
  `apps/api/src/modules/finance/README.md` but not started — queued,
  explicitly paused (not abandoned) in favor of Phase 10.
- **Admin audit logging / notifications** — schema and API are complete and
  tested, but nothing else in the app calls them yet. No other module
  writes a real audit row or dispatches a real notification outside the
  admin module's own self-tests. The plumbing exists; it isn't wired to
  real business events.
- **Phase 8 AI Workspace** — all 6 features (Proposal Generator,
  Requirement Analyzer, Project Estimator, Task Generator, Content
  Assistant, Email Assistant) are backend-complete and were verified
  live against the real Anthropic API at build time, but **there is zero
  `apps/web` UI for any of them** — unreachable from the actual app today.
- **Phase 10 (Production Engineering, 15 modules)** — modules 1–11 done
  (see §1); modules 12 (Testing), 13 (Docs), 14 (Tech debt), 15 (Readiness
  report) not started.

## 3. Remaining modules (not started)

- **`content`** — `apps/api/src/modules/content/` is a README-only stub,
  zero implementation. Was paired with `projects` in the original Phase
  7 scaffold; only `projects` got built.
- **14 more Phase 9 "Enterprise Operations Suite" modules**, planned in
  `docs/implementation/decisions.md` (2026-07-30 entry) but with zero code:
  Contracts, HR, Resource Planning, Time Tracking, Help Desk, Knowledge
  Base, Calendar, Integrations, Analytics, Search, Automation, Audit,
  Feature Flags, Quality Review.
- **Payment gateway integration** — no real gateway is wired; env vars are
  `replace-me` placeholders. This is why refunds (§4) can't be implemented
  yet either.
- **Managed IdP/OIDC** — `IDP_ISSUER_URL`/`IDP_CLIENT_ID`/`IDP_CLIENT_SECRET`
  exist as placeholders but are unvalidated and not wired into the real
  auth flow, which uses local JWT/password auth only.

## 4. Known issues

- **Local dev environment instability, root cause identified 2026-08-03:**
  this repo lives inside a OneDrive-synced folder
  (`...\OneDrive\Desktop\ClientProject\...`). During an extended local
  verification session, `apps/api`'s `nest start --watch` was observed in
  a continuous "File change detected → recompiling" loop every few seconds
  with zero actual code edits happening — almost certainly OneDrive's
  background sync touching file metadata/timestamps, which the file
  watcher picks up as changes. This intermittently made the local API
  completely unreachable (confirmed via direct `curl` returning
  connection-refused, then recovering on its own). **Recommendation:**
  move the working copy outside any cloud-synced folder (or exclude the
  repo from OneDrive sync) before resuming local development — this alone
  may resolve several "flaky" symptoms observed below.
- **CRM → Clients tab and the Orders page were observed stuck on their
  loading skeleton indefinitely** during the same local session, across
  multiple attempts, including one after a fresh login with a confirmed-
  healthy backend. However, further investigation showed even static
  Next.js JS chunk downloads stalling in "pending" state on the same
  attempts — i.e., the dev server itself was stalling, not necessarily
  application logic. **This is unconfirmed, not a verified bug** — it's
  most likely the same OneDrive/resource-instability issue above, but a
  genuine frontend defect on these two specific pages hasn't been ruled
  out either. **Needs a clean retest** (repo moved outside OneDrive, fresh
  machine restart, single browser tab) before concluding either way. Every
  other CRM tab tested (Leads, Quotations) worked correctly, including
  proper session-expiry error handling and recovery on Quotations.
- **Local build (`pnpm --filter @antrique/web build`) fails at the final
  `output: standalone` file-tracing step with a Windows-only symlink
  `EPERM`** — pre-existing, not a regression (confirmed unrelated to any
  change in this freeze pass). Compile, typecheck, lint, and all 53 static
  pages generate successfully before this step. Does not affect CI
  (`ubuntu-latest`) or either real deployment target (Vercel, Docker/
  Render — both Linux). Enabling Windows Developer Mode may resolve this
  locally; not attempted as part of this freeze (environment change, not a
  code fix).
- **Production database migration status not independently verified.**
  Local migrations (24/24) are confirmed applied and schema-valid, but
  Render's free tier doesn't auto-run `prisma migrate deploy` on push, and
  this session had no Supabase credentials/dashboard access to check
  production directly. Recommend running `prisma migrate status` against
  the real production `DATABASE_URL` before treating the freeze as fully
  closed out.
- **`POST /payments/:id/refund` always returns 501.** This is a
  deliberate, fully tested stub (`apps/api/src/modules/billing/
  payment.service.ts` — `refundPlaceholder()`), guarded by a real
  `payments:refund` permission on a real, reachable route. Not a bug — but
  flagged here explicitly so it isn't mistaken for one after months away.
  Fixing it for real requires the payment gateway integration above.
- **`docs/product/*.md` have a known swapped-content bug** (open since
  2026-07-16, tracked in `docs/implementation/blockers.md`) — every file's
  content doesn't match its filename, and the real "04 — UX" document
  appears genuinely lost (overwritten, not just misplaced). Don't trust
  those filenames at face value; the mapping is documented in
  `blockers.md`.
- **Open product/business decisions** (tracked in `blockers.md` since
  2026-07-14): business model, India/DPDP compliance approach, and
  beachhead vertical are still unconfirmed. Nothing currently blocks on
  these, but they'll shape schema/scope whenever picked back up.
- Non-Anthropic AI adapters (OpenAI, Gemini, OpenRouter) are structurally
  complete but never tested against a real key.

## 5. Technical debt

- Redis is used for **cache only** (first real consumer: authorization
  role/permission cache, 60s TTL). `apps/api/src/config/queue/` exists but
  constructs no real client — there is no queue/worker topology despite
  Redis being deployed. Deliberately deferred (per Phase 10 Module 7) —
  no worker-process topology exists yet to justify one.
- Sentry SDK is integrated (`apps/api/src/monitoring/sentry.ts`) but
  `SENTRY_DSN` is unset by default — no project has been provisioned, so
  it's a documented no-op today.
- `NEXT_PUBLIC_ANALYTICS_ID` is unset — no analytics provider is wired.
- Root-level `database/` directory (pre-Prisma Sprint-1 scaffold) has been
  removed as part of this freeze — see `CHANGELOG.md`. Real schema lives
  in `apps/api/prisma/`.
- `docs/architecture/*.md` (24 files) were spot-checked, not fully
  re-audited, during this freeze pass — treat as "probably current" but
  verify against the code for anything you're about to build on.

## 6. Deployment status

**Live-verified 2026-08-03** (read-only checks: homepage, `/health/live`,
`/health/ready`, Swagger gating, authenticated dashboard shell): production
is healthy. Vercel responds in ~1.6s. Render's free-tier API takes ~25s to
respond on a cold start after idle (expected free-tier behavior, not a
defect) then responds normally. `/health/ready` confirms `database: ok` and
`redis: ok` against the real production Postgres/Redis. Swagger is
correctly inaccessible in production (returns a tenant-resolution 400
rather than exposing API docs — `SWAGGER_ALLOW_IN_PRODUCTION` is unset, as
designed). Contact form, Quote form, lead creation, email sending, and file
upload were **not** exercised against production this pass (would write
real data / send real email — deferred by choice, not a failure).

Two deployment shapes exist:

1. **Documented in-repo:** Docker Compose, self-host/VM target.
   `docker-compose.prod.yml` — resource-limited, log-rotated, non-root,
   healthchecked. See `docs/architecture/deployment.md`.
2. **Actual live production** (not previously documented in-repo — added
   to `docs/architecture/deployment.md` §8 as part of this freeze):
   - **API**: Render web service `antrique-api` (free tier, Singapore),
     auto-deploys from GitHub `main`.
   - **Web**: Vercel project `antrique-web`, auto-deploys from `main`.
   - **Postgres**: Supabase (`aws-0-ap-southeast-2.pooler.supabase.com`),
     not Render's managed Postgres.
   - **Redis**: managed instance (Upstash, Sydney) — not Render's managed
     Redis, and not the same as the local `docker-compose` Redis.
   - Render's free tier has no pre-deploy hook — `prisma migrate deploy`
     must be run manually against Supabase after any new migration.

`infrastructure/terraform/README.md` and `infrastructure/k8s/README.md`
remain deliberate, unfilled placeholders — no IaC exists for either
deployment shape.

## 7. Environment variables

Full reference lives in each app's `.env.example` (`.env.example` at repo
root, `apps/api/.env.example`, `apps/web/.env.local.example`), validated in
`apps/api/src/config/env.validation.ts`. Grouped summary:

| Group | Variables | Required? |
|---|---|---|
| App/server | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `LOG_FORMAT`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `CORS_ALLOWED_ORIGINS`, `APP_VERSION`, `GIT_COMMIT_SHA` | Has dev-safe defaults |
| Database | `DATABASE_URL`, `DATABASE_SHADOW_URL`, `DATABASE_SSL`, `DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT_MS`, `DATABASE_CONNECTION_TIMEOUT_MS`, `DATABASE_STATEMENT_TIMEOUT_MS` | `DATABASE_URL` required; rest have defaults |
| Redis | `REDIS_URL` | Required (has local default) |
| Auth/JWT | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥32 chars), `JWT_ACCESS_TOKEN_TTL`, `JWT_REFRESH_TOKEN_TTL`, `HASH_MEMORY_COST`/`TIME_COST`/`PARALLELISM`, `DEFAULT_TENANT_ID` | Secrets are genuinely required for a real deploy |
| Auth/IdP | `IDP_ISSUER_URL`, `IDP_CLIENT_ID`, `IDP_CLIENT_SECRET` | Placeholder only — unused today |
| Payments | `PAYMENT_GATEWAY_PUBLIC_KEY`, `PAYMENT_GATEWAY_SECRET_KEY`, `PAYMENT_WEBHOOK_SECRET` | Placeholder only — no gateway integrated |
| Storage | `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_ENDPOINT`, `STORAGE_PUBLIC_URL_BASE` | Optional — image upload returns 503 if unset |
| Email | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` | Optional — sends silently no-op if unset |
| AI | `AI_DEFAULT_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `OPENAI_API_KEY`/`MODEL`, `GOOGLE_AI_API_KEY`/`MODEL`, `OPENROUTER_API_KEY`/`MODEL` | Optional — Anthropic is the only tested provider |
| Observability | `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `METRICS_ENABLED`, `METRICS_TOKEN` | Optional, blank = no-op |
| API tooling | `SWAGGER_ENABLED`, `SWAGGER_ALLOW_IN_PRODUCTION`, `SWAGGER_PATH`, `HEALTH_PATH` | Has defaults |
| `apps/web` | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_TENANT_ID`, `NEXT_PUBLIC_ANALYTICS_ID`, `NEXT_PUBLIC_SENTRY_DSN`, `API_INTERNAL_URL`, `SESSION_COOKIE_NAME`, `SENTRY_DSN` | `API_BASE_URL`/`TENANT_ID` required; analytics/Sentry optional |
| Docker (root `.env.example`) | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Required only for `docker-compose.prod.yml` |

## 8. Third-party services

| Service | Used for | Status |
|---|---|---|
| Supabase (Postgres) | Primary production database | Live, confirmed via real deploys |
| Supabase Storage | Product images, AI Requirement-Analyzer document uploads | Live, confirmed via real uploads |
| Resend | Transactional email (contact/newsletter, AI-drafted emails) | Live, confirmed via real delivered messages |
| Anthropic | AI completions (all Phase 8 backend features) | Live, confirmed via real API calls |
| OpenAI / Google Gemini / OpenRouter | Alternate AI providers | Built, never tested with a real key |
| Sentry | Error tracking | SDK integrated, no project provisioned (no-op) |
| Render | API hosting | Live production |
| Vercel | Web hosting | Live production |
| Upstash | Redis hosting for production | Live production |
| Payment gateway (unnamed) | Hosted card processing | Not integrated |
| Managed IdP/OIDC | SSO auth | Not integrated |

## 9. APIs configured

- `apps/api/openapi.json` — generated (`pnpm generate:openapi`), gitignored,
  regenerated fresh every CI run. This + the live `GET /api/docs` Swagger
  UI are the authoritative API contract — **not**
  `packages/api-contract` (a pre-implementation draft, see that package's
  own README).
- `apps/web`'s `pnpm generate:api-types` regenerates
  `apps/web/src/types/api/schema.ts` from the live backend's OpenAPI spec.

## 10. Database status

- Schema: `apps/api/prisma/schema.prisma`, provider `postgresql`.
- **24 migrations** (`apps/api/prisma/migrations/`, 2026-07-17 through
  2026-08-01) covering init, RLS, catalog, customizer, inventory, orders,
  CRM, billing, admin/analytics, AI workspace/prompts, projects, finance,
  account lockout, quotation payment stages.
- Row-Level Security is real: `antrique_app`/`antrique_service` DB roles
  (`NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`), tenant-scoped
  policies on every tenant-owned table, `SET LOCAL app.current_tenant_id`
  wired through `PrismaService`'s `$extends` hook + `TenantMiddleware`.
- `apps/api/prisma/seed.ts` is explicitly dev-only (fake admin password,
  demo data) — must never run against production. Production's one real
  tenant row was created by hand via a one-off script.
- The root `database/` directory (pre-Prisma placeholder) has been removed
  as part of this freeze — it applied to nothing.

## 11. Storage status

Real S3-compatible client (`@aws-sdk/client-s3`) wrapped by
`apps/api/src/storage/storage.service.ts`, backed by **Supabase Storage**
in production. Used for product images
(`POST /products/:id/images`) and AI Requirement Analyzer document uploads.
Unconfigured in an environment → returns 503, doesn't crash.

## 12. Redis status

Real `ioredis` client (`apps/api/src/cache/redis.service.ts`), fail-fast on
boot. **Cache only** — `RedisCacheStore` with a `cache:` prefix and
`SCAN`-based invalidation; first real consumer is the authorization
role/permission cache (60s TTL). No queue/worker topology exists despite
`queue.config.ts` reading the same `REDIS_URL` (deliberately deferred, see
§5). Feeds the `GET /health/ready` probe.

## 13. Email status

**Resend**, real and live. `apps/api/src/email/email.service.ts`, fire-and-
forget via `SendEmailJob`/`JobRunner`. Confirmed real delivery (Contact
form → captured Resend message id). Callers today: `ContactRequestService`,
`NewsletterSubscriberService`. The AI Email Assistant (Phase 8) drafts
content through the same service but is deliberately never live-called
automatically — a human sends, the app never auto-sends AI-drafted email.

## 14. AI status

Strategy/factory pattern, four adapters
(`apps/api/src/ai/adapters/{anthropic,openai,gemini,openrouter}.adapter.ts`).
**Anthropic is the only adapter confirmed working** — verified live against
the real API. The other three are structurally complete but unverified.
`AI_DEFAULT_PROVIDER=anthropic` is the effective default. All 6 Phase 8
features route through `AiService.complete()`, so switching or adding a
provider is a config change, not a code change, once the corresponding
adapter is verified.

**Note as of this freeze:** the dev-environment `ANTHROPIC_API_KEY` had no
credit balance, so live AI calls were returning 502 in local dev at the
time of this snapshot — check the account balance before assuming AI
features are broken when you resume.
