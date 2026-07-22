# Runbook

New this milestone (Milestone 14 — Production Infrastructure). Day-2
operations for `apps/api` — what to check when something looks wrong, in
the order that's actually fastest to narrow down a real incident.
Companion to `operations.md` (config knobs, secret rotation, dependency
audit cadence — the M13-era operational doc) and `security.md` §"What to
watch" — this doc adds the M14-era observability surface (health
endpoints, correlation IDs, structured startup/shutdown logs) those didn't
have yet when written.

## 1. "Is it up?"

```
curl https://<host>/health/live      # process alive? no dependency check
curl https://<host>/health/ready     # can it actually serve traffic? checks the database
```

`live` returning anything other than `200 {"status":"ok",...}` means the
process itself is wedged or not listening — check the container/process
directly (is it running at all? OOM-killed? crash-looped?), not the
application logs first. `live` succeeding but `ready`/`startup` returning
`503 {"status":"error","checks":{"database":"error"}}` means the process is
fine but can't reach Postgres — check the database itself (is it up? is
`DATABASE_URL` pointing at the right host? is a connection-limit exhausted?)
before touching the API process.

## 2. Tracing one specific request

Every response carries `X-Request-Id`/`X-Correlation-Id` (echoed back as of
this milestone — previously only threaded through this app's own internal
logs, not visible to the caller). Given either value, every log line for
that request — the `HTTP request completed`/`Slow HTTP request` entries,
every `Database query executed`/`Slow database query` entry that request
triggered, any `Audit event`, any `Unhandled exception` — carries the same
id in its `context.requestId`/`context.correlationId` field (structured
JSON logs, `LOG_FORMAT=json`). Grep/query by that id in whatever log
aggregation the deployment uses; there is no separate per-request trace
store to check.

A client that already has its own correlation id can send it as
`X-Correlation-Id` on the original request — `HttpLoggingMiddleware` reuses
an incoming value instead of generating a new one, so the same id threads
through both the client's own logs and this app's.

## 3. "Requests are slow"

Two independent `warn`-level log signals, both pre-existing (Milestone
12), both request-id-correlatable per §2:

- `Slow database query` (>100ms, `PrismaService`) — if these correlate with
  the slow requests, the database is the bottleneck (check for a missing
  index, lock contention, connection-pool exhaustion — not an application
  code problem).
- `Slow HTTP request` (>1000ms, `HttpLoggingMiddleware`) — if these fire
  WITHOUT a corresponding slow-query log, the bottleneck is in
  application code (a service-layer loop, an external call) — not the
  database.

## 4. "A user can't log in" / "getting 401/403 unexpectedly"

- `user.login` events (`AUDIT_LOGGER`, structured logs, Milestone 13) with
  `outcome: FAILURE` for that user's email — `metadata.reason` says why
  (wrong password vs. account not found; both intentionally
  undifferentiated in the HTTP response itself, per `security.md`'s
  timing-attack defense, but the SERVER-SIDE log is not similarly
  vague).
- `authz.role_denied`/`authz.permission_denied` events for that user —
  `metadata` carries the exact `requiredRoles`/`requiredPermissions` vs.
  `heldRoles`/`heldPermissions` actually resolved, enough to tell "wrong
  role assigned" from "role assigned correctly but this route needs a
  permission nobody granted" without further digging.
- A spike of either across MANY distinct users/IPs, rather than one, is a
  credential-stuffing/enumeration signal, not an individual access
  problem — see `security.md` §"What to watch."

## 5. "Is this deployment actually running what I think it's running?"

`GET /runtime` (Admin/Super Admin only, `system:read` permission) returns
`version`/`gitCommitSha`/`nodeEnv`/`uptimeSeconds`/`database`. Compare
`version`/`gitCommitSha` against the commit/tag that was supposed to be
deployed — a mismatch means the deploy didn't actually roll out (check the
deploy pipeline/orchestrator, not the application). `uptimeSeconds` resets
to near-zero on every restart — a lower-than-expected value during a
"why did latency spike" investigation is itself a clue (the process
restarted recently, possibly due to an OOM kill or crash the container
runtime's own logs would show).

## 6. Restarting/redeploying safely

1. A new instance's `/health/ready` must return `200` before an
   orchestrator routes traffic to it (this is what the `readiness` probe
   type is FOR — see `deployment.md` §4's own note that this app's
   startup sequence already guarantees DB connectivity by the time it's
   listening at all, so a slow `ready` typically means the DATABASE is
   slow to respond, not that the app itself needs more warm-up time).
2. SIGTERM the old instance; give it time to drain in-flight requests
   before the orchestrator sends SIGKILL — see `deployment.md` §5's
   shutdown sequence for exactly what runs in that window (`PrismaService`
   disconnects last, after every OnModuleDestroy hook that needs it has
   had its chance to run).
3. Confirm via `GET /runtime` that the new instance's `gitCommitSha`
   matches what was deployed (§5).

## 7. When the runtime metadata / health endpoints themselves are wrong

- `GET /health/*` returning `404`: confirm the deployment's load
  balancer/ingress is routing `/health/*` to this service at all — these
  routes are deliberately NOT under `/api/v1/...` (see
  `deployment.md` §6), so a proxy config that only forwards `/api/*` will
  never reach them.
- `GET /runtime` returning `401`/`403` for someone who should have access:
  confirm they hold the `admin` or `super_admin` role in the CORRECT
  tenant — `system:read` is granted only to those two roles (see
  `security.md`'s RBAC review), and like every other permission check in
  this app, it's resolved within the caller's own tenant, not globally.
