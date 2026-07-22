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

1. Rotate the affected secret immediately (§3) — this is the only server-side
   revocation mechanism that exists (no per-token revoke list, no
   refresh-token-reuse detection — `security.md` §13).
2. For a single compromised user account rather than a leaked signing
   secret: there is no way to revoke that user's specific outstanding
   tokens without rotating the shared secret for everyone. This is a real
   operational gap stemming directly from the "no refresh-token
   rotation/reuse detection" accepted risk in `security.md` §13 — building
   per-session revocation is the fix, and is explicitly out of this
   milestone's scope (new session-state tracking, not a hardening pass over
   existing code).
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

**Background job infrastructure exists but nothing runs on it.**
`apps/api/src/jobs/` (`JobRunner`, retry/dead-letter abstractions) is
real, in-process, infrastructure only — zero scheduled jobs, zero queue
backend (see `jobs/README.md`). Nothing to tune or monitor here yet;
listed so a future consumer's own operational needs (dead-letter alerting,
retry-exhaustion monitoring) have an obvious place to extend this
document when that day comes.

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
