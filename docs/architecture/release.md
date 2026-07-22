# Release Infrastructure

New this milestone (Milestone 14 — Production Infrastructure). Checklists,
not automation — this milestone builds the CI pipeline/Docker image/health
endpoints a real release process needs (see `deployment.md`), but an actual
release/rollback/DR *procedure* against real hosting infrastructure remains
future work (no hosting target is provisioned yet — `deploy-production.yml`/
`deploy-staging.yml`'s own header comments). These checklists are what that
future work executes against once a real target exists; write them now so
the gap between "code is ready" and "process is ready" is explicit, not
silently assumed away.

## Release tagging strategy

New this pass. No tagged release has been cut yet — this is the intended
scheme for when one is:

- **Format:** `vMAJOR.MINOR.PATCH` (semantic versioning) — e.g. `v1.0.0`
  for the first Backend v1.0 release this pass prepares for.
- **What triggers a tag:** a deliberate decision at release time, not
  every merge to `main` — tag the exact commit that passed CI
  (`lint-typecheck-test-build`/`migration-validation`/`openapi-generation`/
  `dependency-audit`/`docker-build` all green) and was verified via the
  deployment/production-verification checklists above.
- **How it reaches the build artifacts:** pass the tag as `version` to
  `deploy-staging.yml`/`deploy-production.yml` (the `workflow_dispatch`
  input both accept — see each workflow's own `on.workflow_dispatch.inputs`)
  so it flows into the Docker build's `APP_VERSION` arg and the release
  bundle's `release-metadata.json` `version` field. CI's own `ci.yml` runs
  (push/PR triggers, no `version` input available) fall back to
  `github.ref_name` (the branch name) instead — correct for "what build is
  this," not intended to be read as a release version.
- **What's NOT yet automated:** creating the git tag itself, generating
  release notes from commits/PRs, and attaching the release bundle to a
  GitHub Release — all reasonable next steps once real releases are
  actually being cut, deliberately not built speculatively ahead of that
  (see "Future operational roadmap" below).

## Release checklist

1. `main` branch: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
   all clean (CI's own `lint-typecheck-test-build` job already gates every
   merge to `main` on this — this step is "confirm CI is green," not a
   manual re-run).
2. CI's `migration-validation` job green — every migration applies clean
   to a throwaway database.
3. CI's `docker-build` job green — the `runtime` image builds.
4. `docs/implementation/progress.md`/`decisions.md` updated for whatever
   shipped (this repo's own established discipline — see `CLAUDE.md`).
5. Tag the release (`git tag vX.Y.Z`) — this is what CI's Docker build step
   should stamp into `APP_VERSION` (currently stamps `${{ github.sha }}`
   for both `APP_VERSION`/`GIT_COMMIT_SHA` on every build; switching
   `APP_VERSION` to the tag specifically, when one exists, is a small,
   deliberately-deferred follow-up — see "Deferred" below).
6. Confirm `apps/api/.env.example`/`docs/architecture/environment.md` are
   still accurate for the target environment — a new required variable
   introduced by the release and not yet documented is a deploy-time
   surprise waiting to happen.

## Deployment checklist

Before traffic is routed to a new instance (see `runbook.md` §6 for the
mechanics):

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_SSL=true`
- [ ] Real, distinct, high-entropy `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`
      (not the `.env.example` placeholders — `env.validation.ts` refuses to
      boot in production if either is, per its own production-safety check)
- [ ] `CORS_ALLOWED_ORIGINS` set to the real frontend origin(s) — an empty
      value silently blocks every browser client (safe, but will look like
      an outage if unintentional)
- [ ] `SWAGGER_ENABLED=false` unless deliberately serving docs publicly (if
      `true`, `SWAGGER_ALLOW_IN_PRODUCTION=true` must ALSO be set — a
      double opt-in, not an accident)
- [ ] Migrations applied (`prisma migrate deploy`) BEFORE the new instance
      starts serving traffic — this app does not run migrations
      automatically at boot (see "Database migration strategy" below)
- [ ] `GET /health/ready` returns `200` before the orchestrator routes
      traffic to the new instance
- [ ] `GET /runtime`'s `gitCommitSha` matches what was actually deployed

## Rollback checklist

1. Route traffic back to the previous known-good image/instance (exact
   mechanism depends on the hosting target — not yet chosen, see
   `deployment.md` §7).
2. **Do not** roll back a database migration as part of an application
   rollback unless the migration itself is confirmed to be the cause — see
   "Database migration strategy" below for why an application-level
   rollback and a schema rollback are different, higher-risk operations
   that should not be conflated by default.
3. Confirm `GET /health/ready` and `GET /runtime` on the rolled-back
   instance before considering the rollback complete — the same checks as
   a forward deploy, not a special-cased skip.
4. Check `authz.*`/`user.login` audit events (structured logs) and the
   DB-persisted `AuditLog` table (`GET /audit-logs`) for anything that
   happened during the bad deploy's window that might need manual
   correction (an operation that partially succeeded before the rollback,
   for instance) — a rollback restores CODE, not necessarily every
   side effect already committed to the database.

## Database migration strategy

Prisma migrations (`apps/api/prisma/migrations/`), applied via
`prisma migrate deploy` — deliberately NOT run automatically at application
boot (no migration-runner code exists in `main.ts`/`app.module.ts`): running
migrations as a distinct, explicit release step (before the new application
version starts, per the deployment checklist above) means a migration
failure is caught BEFORE any instance running the new (migration-expecting)
code goes live, rather than surfacing as a confusing runtime error on the
first request that touches the new schema. CI's `migration-validation` job
(Milestone 14) is the first automated check that every committed migration
applies cleanly — it runs against a throwaway database, not any real
environment; running the SAME `prisma migrate deploy` command against a
real target's actual database remains a manual (or future-automated)
release step, not something CI itself does.

**Expand-then-contract**, per `architecture.md`'s own governing decision
(“CI/CD... Expand-then-contract migrations”) — add new columns/tables
nullable-or-defaulted first (deployable alongside old code), migrate data,
switch application code over, only then drop the old column/table in a
LATER migration. No migration in this codebase's own history has needed
the contract half yet (every migration so far has been additive — see
`docs/architecture/database-schema.md`), but the discipline applies the
moment one does.

## Backup strategy

**Not yet real for any deployed environment** — `docker-compose.prod.yml`'s
`postgres` service (Milestone 14) uses a named Docker volume
(`postgres-data`) with zero automated backup; a target-state managed
Postgres (per `architecture.md`'s "Managed, PITR backups") would get this
for free, but nothing in this codebase provisions that yet
(`infrastructure/terraform/README.md` remains a placeholder). Flagged
explicitly here rather than left implicit: **a single-host
`docker-compose.prod.yml` deployment today has no backup of its database
at all.** Treat provisioning either a managed Postgres with PITR, or at
minimum a scheduled `pg_dump` cron job against the single-host deployment,
as a release-blocking gap for any real production traffic — not a
nice-to-have.

## Restore strategy

Follows directly from whichever backup mechanism is actually provisioned
(none is, today — see above): a managed Postgres's own point-in-time-
restore tooling, or `pg_restore` against the most recent `pg_dump` for the
single-host case. Either way: **restore into a NEW database/instance
first, verify via `GET /health/ready` against that restored instance
before cutting traffic to it** — never restore in place over a live
database without a verified-good restore target first.

## Production verification checklist

New this pass (Engineering Polish). Distinct from the deployment checklist
above (which is what to confirm BEFORE routing traffic) — this is what to
confirm AFTER a deployment is live and receiving real traffic:

- [ ] `GET /health/live` returns `200` — the process itself is responsive.
- [ ] `GET /health/ready` returns `200` with `checks.database: "ok"` — the
      database is actually reachable from this instance, not just from
      wherever it was tested pre-deploy.
- [ ] `GET /runtime` (Admin/Super Admin) — `version`/`gitCommitSha` match
      what was intended to ship; `uptimeSeconds` is small (a freshly
      started instance), not a stale value suggesting the deploy didn't
      actually replace the running process.
- [ ] `GET /api/docs` returns `404`/is unreachable — UNLESS Swagger was
      deliberately enabled for this environment (see `environment.md`
      "Swagger in production"); an unexpectedly-reachable Swagger UI in
      production is a data-exposure incident, not a convenience left on.
- [ ] A real request through the full stack succeeds end to end (e.g.
      `POST /api/v1/auth/login` with a known test account) — the health
      endpoints confirm the process and the database are up, but not that
      the request pipeline (guards, validation, the actual business
      logic) is wired correctly; only a real request proves that.
- [ ] Structured logs show the expected `requestId`/`correlationId`
      propagation for that test request (`runbook.md` §2) — confirms
      observability didn't regress silently.
- [ ] No `Unhandled exception` log entries appear in the minutes following
      the deploy that weren't already expected/reproduced pre-deploy.

## Operational limitations (consolidated)

New this pass. Every one of these is already documented in its own
section elsewhere (`security.md` §13, `release.md`'s own "Backup
strategy"/"Disaster recovery checklist" above) — collected here as one
list so a reviewer doesn't have to hunt across four documents to see the
full shape of what this backend does NOT yet do operationally:

- No refresh-token rotation/reuse detection (`security.md` §13).
- No CSRF protection (not currently applicable — Bearer-only API; would
  become a real gap the moment cookie-based auth is ever added).
- No unified audit trail — structured-log audit events (login/authz
  denial) and the DB-persisted `AuditLog` table are two separate,
  un-joined sources (`security.md` §9/§13).
- No application-level request timeout (relies on the upstream load
  balancer/Node defaults).
- No secrets vault/KMS — secrets are validated env vars, not rotated
  automatically or centrally managed (`security.md` §13, `operations.md`
  §3).
- No per-instance rate-limit sharing — `@nestjs/throttler`'s in-memory
  store means the effective rate-limit budget scales with instance count
  in a horizontally-scaled deployment (`operations.md` §4).
- No automated database backup for any deployment target (above).
- No rehearsed disaster-recovery drill, no defined RPO/RTO (above).
- No real hosting target, container registry, or actual deploy
  automation — `deploy-staging.yml`/`deploy-production.yml` remain
  templates with placeholder steps (`deployment.md` §2/§7).
- No log aggregation/alerting system wired to the structured log stream
  this app already produces — the EVENTS exist (`security.md` "What to
  watch"); nothing consumes them into a dashboard/pager yet.
- `.trivyignore`/parts of `apps/api/audit-allowlist.json`'s own
  reachability analysis have not been validated against a REAL Trivy scan
  or a from-scratch `pnpm audit` run outside this development environment
  (Docker isn't available here) — first real CI run is the actual
  validation.

## Future operational roadmap

New this pass. Not commitments or scheduled work — a plain list of what
closing the gaps above would actually require, roughly in the order a
production launch would need them:

1. **Provision real hosting infrastructure** — the single largest gap.
   `infrastructure/terraform/`/`infrastructure/k8s/` remain placeholders;
   everything else in this roadmap assumes a real target exists to deploy
   to.
2. **Container registry + fill in `deploy-staging.yml`/
   `deploy-production.yml`'s placeholder steps** — push/rollout/health-
   verification, using this pass's own workflow templates as the
   starting shape.
3. **Automated database backups** (managed Postgres PITR, or a scheduled
   `pg_dump` for a single-host deployment) — release-blocking for real
   production traffic, not yet addressed.
4. **Wire structured-log events to an actual alerting system** —
   `security.md`'s own "What to watch" list is ready to be consumed; the
   consumer doesn't exist yet.
5. **Refresh-token rotation/reuse detection** — closes a real
   authentication gap (`security.md` §13); genuinely new session-state
   tracking, deliberately out of scope for every prior infrastructure-
   only pass.
6. **Unify the two audit trails**, or make the split a permanent,
   intentional design rather than an artifact of avoiding a backwards
   module dependency (`security.md` §9).
7. **A rehearsed DR drill** against whatever backup mechanism #3
   provisions — a backup that has never been restored is not a verified
   backup.
8. **A secrets vault/KMS integration** — closes the "secrets are env vars,
   not centrally rotated" gap.

## Incident response checklist

See `runbook.md` for the day-to-day diagnostic playbook (tracing a
request, "is it up," slow requests, auth failures) and
`security.md` §6 ("Incident response: a leaked JWT secret or a compromised
credential") for the security-specific procedure. This checklist is the
coordination layer above those:

1. Confirm scope via `runbook.md` §1 (`/health/live`/`/health/ready`) —
   is this a total outage, a degraded-dependency issue, or isolated to
   specific requests?
2. Correlate via `runbook.md` §2 (request/correlation ids) if the report
   is about specific failing requests, not a total outage.
3. If credentials/secrets are suspected compromised, follow
   `security.md` §6 immediately — that procedure (secret rotation) is
   disruptive (forces every logged-in user to re-authenticate, per that
   section's own note) and should not wait on a full root-cause
   investigation first.
4. Once resolved, update `docs/implementation/decisions.md` with what
   happened and what changed — this repo's own established discipline for
   any genuine incident/decision, not unique to this checklist.

## Disaster recovery checklist

**Aspirational — no rehearsed drill has been run, no RPO/RTO target is
defined for any real deployment yet** (see `architecture.md`'s own
target-state "DR: IaC rebuild, replica + PITR, RPO/RTO targets, rehearsed
drills" — none of that exists today). What a real DR plan needs, once real
hosting infrastructure exists to plan around:

1. A documented RPO (how much data loss is acceptable) and RTO (how long
   full recovery may take) — neither is defined yet; this is a product/
   business decision, not something `apps/api`'s own code can set.
2. A tested restore procedure (see "Restore strategy" above) — restoring
   into a verified-clean environment, not assumed to work because a backup
   file exists.
3. Infrastructure-as-code capable of rebuilding the full stack from
   scratch — `infrastructure/terraform/`/`infrastructure/k8s/` remain
   placeholders; this is the largest genuine gap between this milestone's
   own scope ("backend code + its own deployment artifact") and a real DR
   posture.

## Deferred, explicitly

- `ci.yml`'s own automatic runs (push/PR, no manual `version` input
  available) stamp `github.ref_name` into build metadata, not a real
  semantic version — `deploy-staging.yml`/`deploy-production.yml` DO now
  accept a `version` input that flows through to `APP_VERSION`/
  `release-metadata.json` (see "Release tagging strategy" above), but
  nothing automatically creates the git tag itself or turns a merge into
  a release — that step remains manual/undecided.
- No automated database backup for any deployment target (see "Backup
  strategy" above) — release-blocking for real production traffic.
- No rehearsed DR drill, no RPO/RTO target (see "Disaster recovery
  checklist" above).
- No actual deploy step in `deploy-staging.yml`/`deploy-production.yml` —
  both are validated TEMPLATES (real Docker build, real deploy/rollback/
  health-verification pipeline shape) with deliberate placeholders past
  that point, pending a real hosting target (`architecture.md`
  "Hosting/CDN").
- See "Operational limitations (consolidated)" and "Future operational
  roadmap" above for the complete list.
