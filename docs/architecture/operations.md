# Operations

Originated Milestone 13 (Security Hardening) as the audit/design
companion to `security.md`; extended Milestone 14 (Production
Infrastructure) with the operational surface that milestone added —
health checks, correlation ids, background job infrastructure, Docker/CI.
For day-to-day incident diagnostics (tracing a request, "is it up," slow
requests), see the newer, more task-shaped `runbook.md` — this doc stays
focused on tunable knobs and standing procedures. Scoped to `apps/api`
only.

## 1. Configuration knobs (env-driven, no code change needed)

| Variable | Governs | Default | Notes |
|---|---|---|---|
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | App-wide `ThrottlerGuard` budget | 60000 / 100 | Per-client (IP), tracked in-memory — resets on process restart, not shared across horizontally-scaled instances (see §4) |
| `CORS_ALLOWED_ORIGINS` | Cross-origin browser access | empty (deny-all) | Comma-separated. An empty value is the safe default for an unconfigured deployment, not an oversight — set it explicitly per environment before any browser client needs to reach this API cross-origin |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing | required, no default | Must differ from each other; rotating either invalidates every outstanding token of that type immediately (no grace-period/dual-secret support exists — see §3) |

The `POST /auth/login` throttle (5 attempts/60s) and the request body-size
limit (256KB) are **not** env-configurable — both are fixed security
policies, deliberately (see `security.md` §5 for why loosening either via
config would be a regression, not a legitimate deployment difference).

## 2. Dependency audit cadence

Run `pnpm audit` on a regular cadence (recommended: before every release, and
at minimum monthly) — not just at milestone boundaries. `security.md` §11
has the full triage of every finding as of Milestone 13; re-triage rather
than re-copy that table when new findings appear, since a package's
reachability in this app's code can change as features are added (e.g., the
day a file-upload endpoint ships, `file-type`'s findings stop being "not
exploitable" and need re-assessment). The two applied `pnpm.overrides`
(`multer`, `lodash`) should be revisited whenever their upstream chain
(`@nestjs/platform-express`, `express`) is next upgraded — an override that
outlives the reason it was added can silently pin a package away from a
real fix.

## 3. Secret rotation

No automatic rotation exists (no vault/KMS integration — `security.md` §13,
a documented accepted risk). Manual rotation procedure until one exists:

1. Generate the new secret value.
2. Deploy it as the new `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`.
3. Every access/refresh token issued under the old secret fails verification
   immediately on deploy (no dual-secret grace window is implemented) —
   every logged-in user is forced to re-authenticate. Communicate this to
   users/clients before rotating, don't treat it as a transparent operation.
4. `DATABASE_URL` rotation is a standard credential-rotation procedure at the
   database-provider level; the app reads it fresh on every restart, no
   in-process caching beyond the connection pool's own lifetime.

## 4. Rate limiting in a horizontally-scaled deployment

`@nestjs/throttler`'s in-memory store (this milestone's own deliberate
choice — "do not introduce Redis") tracks request counts per-process, not
cluster-wide. Running N instances behind a load balancer means the
*effective* budget is `RATE_LIMIT_MAX × N` (and `5 × N` for login), not the
configured value — a client can get up to N× the intended allowance by
having requests land on different instances. This is a known consequence of
the in-memory choice, not a bug: revisit if/when this deployment scales
horizontally and the effective multiplier becomes a real gap (at which point
a shared store, e.g. Redis-backed `ThrottlerStorage`, is the fix — that's
new infrastructure, an explicit call for whoever makes that scaling
decision, not something to add speculatively now).

## 5. What to watch (incident signals)

These structured-log events exist as of Milestone 13 and are what an
alerting/monitoring layer (not yet wired — `security.md` §13) should key off
of when one gets built:

- `user.login` with `outcome: FAILURE`, spiking for a single `actorId`
  (email) or a single source IP — credential-stuffing/brute-force signal.
  The `POST /auth/login` throttle (§1) already caps the *rate* per client;
  a spike across many distinct clients targeting the same account is a
  distributed attack the per-client throttle alone doesn't stop, and is the
  strongest single signal to alert on.
- `authz.role_denied` / `authz.permission_denied`, spiking for a single
  `actorId` — either a misconfigured client (retrying against a route it
  was never granted) or an account attempting to enumerate/escalate access
  it doesn't hold. Each event's `metadata` carries the exact
  `requiredRoles`/`requiredPermissions` vs. `heldRoles`/`heldPermissions`,
  enough to distinguish the two without further investigation.
- `user.token_refresh` with `outcome: FAILURE` — a rejected refresh token
  (expired, tampered, or wrong-secret). Isolated occurrences are normal
  (expired sessions); a spike from one client is the same signal class as
  a rejected-JWT probe.
- HTTP `413` responses (body-size limit) and `429` responses (throttler) —
  both already logged via `HttpLoggingMiddleware`'s existing status-code
  logging; a sustained run of either against one endpoint is a DoS/abuse
  signal.

## 6. Incident response: a leaked JWT secret or a compromised credential

**Updated by Phase 10, Module 4 (Authentication & Session Security) —
per-session revocation is now real; steps 1-2 below are rewritten from
their original Milestone 13 text, which described this as an open gap.**

1. For a single compromised user account: revoke their sessions directly —
   `DELETE /auth/sessions/:id` for one, or have them log in and use §5's
   `user.login`/`authz.*` events to confirm no other session survived. No
   admin-initiated "revoke all sessions for this user" endpoint exists yet
   (only the user's own `GET`/`DELETE /auth/sessions*`, JWT-guarded to the
   caller's own sessions) — for now, rotating that one user's password
   (once a password-reset flow exists — `security.md` §17.5 notes none
   does yet) is the equivalent for an account you don't control.
2. Rotate the shared JWT signing secret (§3) only for a genuinely
   *systemic* compromise (the secret itself leaked, not one user's
   credential) — this invalidates every access token instantly and every
   refresh token on its next use, a much blunter instrument than
   session-level revocation and should not be reached for by default now
   that a narrower option exists.
3. Check `authz.role_denied`/`authz.permission_denied` and `user.login`
   FAILURE events for the affected `actorId` around the incident window to
   scope what the compromised credential was actually used/attempted for.

## 7. Deploy checklist addition (Milestone 13)

Before any environment goes live with this milestone's changes:

- `CORS_ALLOWED_ORIGINS` is set to the real frontend origin(s) for that
  environment — an empty value silently blocks every browser client, which
  is safe but will look like an outage if unintentional.
- `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` are real, distinct, high-entropy
  values — never the placeholder values used in local `.env.example`.
- `trust proxy` is only meaningful in `production` (`main.ts`'s own
  `nodeEnv === 'production'` gate, unchanged) — confirm the upstream load
  balancer actually sets `X-Forwarded-*` headers correctly before relying on
  IP-based rate-limit tracking being accurate in that environment.

## 8. Milestone 14 additions

**Health checks.** `GET /health/{live,ready,startup}` — see `runbook.md`
§1 for how to use them operationally and `deployment.md` §4/§6 for why
they're unprefixed/unversioned and how they gate a rolling deploy.

**Correlation ids are now visible to callers.** `X-Request-Id`/
`X-Correlation-Id` were already threaded through every internal log call
(Phase 1.2C.4); Milestone 14 started echoing both back as response
headers, so an external caller/client can now correlate its own logs
against this app's without needing log access itself — see `runbook.md`
§2.

**Background job infrastructure exists; one real scheduled job runs on
it as of Phase 10, Module 7** (§12) — `apps/api/src/jobs/` (`JobRunner`,
retry/dead-letter abstractions) is real, in-process, and now has both
request-triggered consumers (`SendEmailJob`, Phase 7) and a genuinely
scheduled one (`SessionCleanupScheduler`, every 6 hours). Still zero
Redis-backed queue — see `jobs/README.md` and §12 for why. Dead-letter
monitoring is real too (Module 6's `jobs_dead_letter_queue_size` gauge,
Module 7's own `jobs_executions_total` counter) — retry-exhaustion
alerting still has nowhere to send a page (no alerting destination
configured anywhere, per Module 6's own audit), so the metric exists to
be queried/dashboarded, not yet to trigger a notification.

**Runtime metadata endpoint.** `GET /runtime` (Admin/Super Admin only) —
see `runbook.md` §5 for using it to confirm a deployment actually rolled
out.

**Swagger is a new production-safety surface to keep closed.**
`SWAGGER_ENABLED`/`SWAGGER_ALLOW_IN_PRODUCTION` — see `environment.md`
"Swagger in production." Treat an accidentally-enabled production Swagger
UI as equivalent to a data-exposure incident (it publishes every DTO
shape and route), not a diagnostics convenience left on by mistake.

**Docker/CI operational notes.** See `deployment.md` §1/§2 in full;
briefly: the `runtime` image now runs non-root and has a real
`HEALTHCHECK`; CI now validates migrations against a real (throwaway)
Postgres and builds the Docker image on every push/PR, catching classes
of bug (a broken `CMD` path, a migration that fails against real
Postgres) neither `pnpm test` nor `pnpm build` alone can catch.

## 9. Engineering polish pass additions (pre-Backend-v1.0-review)

**Dependency audit is now allowlist-gated in CI**, not just documented in
prose. `apps/api/audit-allowlist.json` + `apps/api/scripts/
check-audit-allowlist.js` — see `security.md` §15 and `cicd.md` §8. When
updating dependencies going forward: if a previously-accepted finding
disappears (the package got upgraded/removed), remove its entry from
`audit-allowlist.json` too — a stale allowlist entry for a finding that no
longer exists isn't harmful, but it does make the file a less accurate
index of what's actually still accepted.

**Container images are now scanned (Trivy), gated on HIGH/CRITICAL.** See
`container.md` §10. `.trivyignore` follows the same allowlist discipline
as the dependency audit — populate it only in response to a real finding
from a real CI run, never speculatively.

**A dedicated Docker/container reference now exists** —
`docs/architecture/container.md` (build, compose, env vars, versioning,
health, lifecycle, troubleshooting, production recommendations) —
supersedes this document as the first place to check for anything
container-specific; this document remains the place for config knobs,
secret rotation, and incident signals that aren't Docker-specific.

**A dedicated CI/CD pipeline reference now exists** —
`docs/architecture/cicd.md` (every job, execution order, quality gates,
artifact retention, release workflow) — see that doc rather than
`backend.md`'s own narrative summary for the current, authoritative
pipeline shape.

**OpenAPI is now a generated CI artifact, not just a served endpoint.**
`GET /api/docs`/`/api/docs-json` (Milestone 14) remain the live, served
copy; `apps/api/scripts/generate-openapi.ts` + CI's `openapi-generation`
job now ALSO produce `openapi.json` as a downloadable artifact for
frontend developers who don't have (or don't want) a running backend
instance to hit — see `cicd.md` §11.

## 10. Phase 10, Module 5 — Observability (2026-07-30)

Audited logging/tracing/correlation/health/error-visibility (metrics/
alerting/dashboards are Module 6 — Monitoring, separate scope). Full
account: `apps/api/src/logging/README.md`'s own "Future extension
points" section and `docs/implementation/decisions.md`'s 2026-07-30
Module 5 entry. Summary for operational purposes:

- **Every log line is now attributable to a tenant and (when
  authenticated) a user.** `requestId`/`correlationId` already flowed
  through every log line (Milestone 14); `tenantId`/`userId` did not — a
  real gap for anyone trying to scope an incident to one tenant/customer
  from logs alone. Closed: `TenantMiddleware`/`JwtAuthGuard` now enrich
  the active request's log context once each resolves. When grepping
  logs for an incident, filter on `context.tenantId`/`context.userId` the
  same way you already would on `context.requestId`.
- **Sensitive-field redaction exists now**, at the `JsonLogFormatter`
  layer — any metadata key matching `password`/`secret`/`token`/
  `authorization`/`apikey`/`privatekey`/`creditcard`/`cvv` (case-
  insensitive substring match, any nesting depth) renders as
  `[REDACTED]`. Nothing currently logs a request body/header (confirmed
  by this module's audit), so this closes no active exposure — it's a
  guardrail for a future call site, not a response to an incident.
- **Process-level crash visibility.** `uncaughtException`/
  `unhandledRejection` now log (plain `console.error`, not the
  structured `LOGGER` — registered before Nest's DI container exists)
  and exit the process. Previously: a Node default warning with no
  guaranteed process exit, and nothing outside `ExceptionLoggingFilter`'s
  own HTTP-request-scoped coverage. If a deploy log shows one of these
  two event names, treat it as a real crash needing investigation, not
  routine noise — the process exits immediately after logging it, so a
  container orchestrator's own restart-policy log entry should follow
  right behind it.
- **Bootstrap/shutdown log lines are now the same structured JSON as
  everything else.** Previously used `@nestjs/common`'s built-in
  (non-JSON, colorized) `Logger` — a real, if minor, inconsistency for
  log-aggregation tooling expecting uniform JSON on stdout.
- **Distributed tracing (OpenTelemetry) and third-party error tracking
  (Sentry etc.) remain deliberately unbuilt** — audited and confirmed no
  APM/tracing backend is configured in any environment this app deploys
  to today (`SENTRY_DSN`/`OTEL_EXPORTER_OTLP_ENDPOINT` sit blank in
  `.env.example`), and this is a single-service monolith, so the value a
  span adds over the already-real `requestId`/`correlationId`
  propagation is real only once either changes. Not a promise this
  module fulfilled late — see `logging/README.md`'s own "Future
  extension points" for the full reasoning.
- **Health checks re-confirmed correctly scoped** — `GET /health/*`
  checks PostgreSQL only, and that's correct: the cache module
  (`apps/api/src/cache/`) is in-process/in-memory, not a real Redis
  dependency, so there is no second external dependency to check yet.

## 11. Phase 10, Module 6 — Monitoring (2026-07-30)

Audited metrics collection, a scrape endpoint, alerting, uptime/synthetic
monitoring, and dashboards (logging/tracing/correlation/health/error-
visibility are Module 5 — Observability, closed already, separate scope).
Found this was genuinely greenfield: zero metrics library, zero
`/metrics` endpoint, zero alerting integration (not even a blank
placeholder env var, unlike `SENTRY_DSN`), zero uptime-monitoring
mention anywhere in the deploy-facing docs. Full account:
`apps/api/src/metrics/README.md` and `docs/implementation/decisions.md`'s
2026-07-30 Module 6 entry.

- **`GET /metrics`, Prometheus exposition format, is real.** `prom-client`
  (new dependency) backs a `MetricsService` with default Node process
  metrics plus three app-specific ones: `http_requests_total`/
  `http_request_duration_seconds` (labeled by the matched ROUTE PATTERN,
  never the raw path with real ids — unbounded label cardinality is a
  real Prometheus failure mode this deliberately avoids, confirmed live:
  a 404 against a random path is labeled `route="unmatched"`, not the
  probed path itself), `db_query_duration_seconds` (unlabeled aggregate,
  fed by the same Prisma query-event hook that already powers the
  existing slow-query log line), and `jobs_dead_letter_queue_size` (a
  real gauge for the gap this document's own §8 already named by title —
  reads 0 today since zero jobs run, ready for whenever Module 7 changes
  that).
- **Gated by `METRICS_TOKEN`** (`Authorization: Bearer <token>`, matching
  Prometheus's own stock `bearer_token` scrape-config option) — unset by
  default for local dev convenience; `env.validation.ts`'s own
  production-safety check requires it once `METRICS_ENABLED` (default
  true) reaches production, the inverse shape of `SWAGGER_ENABLED`'s own
  check (metrics should stay ON in production; the gate is "must be
  protected," not "must be off"). Live-verified: no header → 401, wrong
  token → 401, correct `Bearer <token>` → 200.
- **`/metrics` stays unprefixed/unversioned** (`bootstrap/api-routing.ts`'s
  `exclude` list, same treatment `/health/*` already gets) and excluded
  from Swagger (`@ApiExcludeController()`) — confirmed via a full
  `openapi.json` diff: zero changes from this module, not even additive
  ones, since this is a scrape endpoint for infrastructure, not an API
  surface consumers document against.
- **Alerting, uptime/synthetic monitoring, and Grafana dashboards
  deliberately NOT built.** No alerting destination is configured
  anywhere in this codebase — not PagerDuty, not Opsgenie, not a Slack
  webhook, not even a blank placeholder env var the way `SENTRY_DSN`
  exists as an acknowledged-but-unbuilt promise. Building real dispatch
  logic with nothing to send to would be speculative, unverifiable
  infrastructure. Dashboards: no Prometheus/Grafana stack is
  deployable in this project's own dev sandbox (no Docker available
  here), so shipping dashboard JSON with no way to render or validate it
  against real scraped data isn't a genuine deliverable — `GET /metrics`
  is the enabling foundation for whenever that stack exists. Uptime
  monitoring is a deploy-topology concern (an external service polling
  `GET /health/live`), not application code — nothing to build.
- **A doc-drift bug found and fixed along the way**:
  `apps/api/src/logging/README.md` claimed `PerformanceLogger` had "no
  current call site" — false since Milestone 12, when
  `DashboardService.overview()` wrapped itself in `measureAsync()`; the
  claim was never re-verified when Module 5 touched this same file.
  Corrected.

### Validation

`pnpm --filter @antrique/api typecheck`/`lint` clean. Full suite: 190
suites, 1168 tests, all passing (auth/http-logging/jobs suites updated
for the new `MetricsService` constructor dependency the same ripple-
effect class Module 5 hit with `JwtAuthGuard`, caught immediately this
time by writing the dependent specs alongside the source change rather
than after). Live-verified against a real compiled server: `db_query_duration_seconds_count`
incremented from a real health-check query, `jobs_dead_letter_queue_size`
read 0, `http_requests_total` correctly distinguished a matched route
(`/health/live`, `/api/v1/auth/login`) from an unmatched one
(`route="unmatched"` for a 404), and all three `METRICS_TOKEN`
authorization paths (missing/wrong/correct) returned the expected status
codes.

## 12. Phase 10, Module 7 — Background Jobs (2026-07-31)

Audited scheduling, real jobs, and the queue backend against what
`apps/api/src/jobs/` already provides (in-process `JobRunner`, retry +
backoff + dead-letter — real since Milestone 14, three request-triggered
fire-and-forget consumers via `SendEmailJob`). Found this genuinely
greenfield within its own stated scope: zero scheduling/cron package,
zero scheduled jobs, zero queue backend connected to any code (Redis is
deployed and healthchecked in `docker-compose.prod.yml`, but no
application code dials it — validated-and-deployed-but-unused, one step
past `SENTRY_DSN`'s validated-but-undeployed). Full account:
`apps/api/src/modules/auth/jobs/session-cleanup.job.ts`'s own comments
and `docs/implementation/decisions.md`'s 2026-07-31 Module 7 entry.

- **`SessionCleanupScheduler` is this codebase's first `@Cron()`-driven
  job** (`@nestjs/schedule`, new dependency) — every 6 hours, calls
  `JobRunner.run(SessionCleanupJob)`, which calls the new
  `SessionRepository.deleteExpired()` (`deleteMany({ where: { expiresAt:
  { lt: now } } })`). Closes a gap `database-schema.md` had already
  named as a future need: `Session` rows never had a delete path —
  revocation only ever set `revokedAt` (soft state); rows accumulated
  forever with no bound. Scoped deliberately to genuinely EXPIRED rows
  only, never revoked-but-unexpired ones — a revoked row inside its own
  expiry window still has forensic value for `refresh()`'s own
  reuse-detection logic (confirming which specific token was replayed).
- **Live-verified against a real compiled server + real Postgres**: a
  genuinely expired `Session` row was inserted directly, the scheduler's
  own `run()` method was invoked through a real Nest application context
  (not a mock — the same `AppModule` DI graph the running server uses),
  and the row was confirmed gone from Postgres afterward — plus
  `jobs_executions_total{job_name="session-cleanup",status="succeeded"}`
  incremented, confirming Module 6's own job-metrics wiring works for a
  real, non-email job too.
- **`jobs_executions_total` (Counter, Module 6's `MetricsService`,
  labeled `job_name`/`status`) is new** — every `JobRunner.run()` call's
  terminal outcome (`succeeded` or `dead_letter`), not each individual
  retry attempt. Closes part of `docs/architecture/operations.md`'s own
  §8 "retry-exhaustion monitoring" gap for query/dashboard purposes;
  still nothing downstream to page on (no alerting destination
  configured anywhere — Module 6's own audit finding, unchanged).
- **A real Redis-backed queue (BullMQ etc.) was deliberately NOT
  built**, despite Redis being a real, deployed, healthchecked sibling
  container in the documented prod topology. Current job volume (one
  scheduled job, three fire-and-forget request-triggered ones) doesn't
  justify the operational complexity of a distributed queue + a NEW
  worker-process deployment topology that doesn't exist today (every
  documented deployment — local dev, single-host `docker-compose.prod.yml`,
  target-state managed containers — runs exactly one API process; see
  `deployment.md` §7). `SessionCleanupScheduler`'s own comment documents
  why the in-process, per-instance, no-distributed-lock model is
  sufficient for THIS job specifically (idempotent, no-payload — running
  it twice, or missing a tick, is harmless). Revisit if job volume grows,
  a job needs cross-instance exactly-once semantics, or a genuine
  multi-process worker topology gets built for other reasons first.

### Validation

`pnpm --filter @antrique/api typecheck`/`lint` clean. Full suite: 192
suites, 1179 tests, all passing. `openapi.json` diffed before/after:
zero changes (this module added no HTTP routes). Live-verified end to
end as described above.
