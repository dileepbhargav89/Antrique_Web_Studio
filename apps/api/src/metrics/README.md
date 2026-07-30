# Metrics (Phase 10, Module 6 — Monitoring)

`GET /metrics` — Prometheus exposition format. The first metrics-
collection surface this codebase has; distinct from `apps/api/src/health/`
(binary up/down checks for an orchestrator) and `apps/api/src/logging/`
(per-event structured JSON, Module 5) — this is aggregate,
time-series data a Prometheus server scrapes on an interval and a
dashboard/alert rule queries over time.

## What's real here

- `metrics.service.ts` — `MetricsService`, wraps a **local** `prom-client`
  `Registry` (never the package's own module-level default `register` —
  see the class's own comment for why: process-global mutable state
  would throw "already registered" the second time this class is
  constructed in the same process, e.g. by more than one Jest spec file
  in the same worker). Registers:
  - Default Node process metrics (`collectDefaultMetrics()`) — heap, CPU,
    event-loop lag, active handles/requests.
  - `http_requests_total` (Counter) / `http_request_duration_seconds`
    (Histogram) — labeled `method`/`route`/`status_code`. `route` is the
    matched Express route PATTERN (`/api/v1/orders/:id`), never the raw
    path with a real id in it — see `resolveRouteLabel()`
    (`common/middleware/http-logging.middleware.ts`) for how that's
    derived and why (unbounded label cardinality is a real Prometheus
    failure mode, not a theoretical one).
  - `db_query_duration_seconds` (Histogram) — unlabeled, a single
    aggregate distribution across every Prisma query (no per-model/
    per-route breakdown — not cheaply available at `PrismaService`'s
    `$on('query', ...)` call site).
  - `jobs_dead_letter_queue_size` (Gauge) — kept in sync with
    `InMemoryDeadLetterStore`'s own entry count on every `record()`/
    `clear()`. Closes the exact gap `docs/architecture/operations.md`
    §8 already named by title ("dead-letter alerting, retry-exhaustion
    monitoring... have an obvious place to extend"); reads 0 today since
    zero real jobs run (`jobs/README.md`) — real infrastructure, not yet
    a real signal.
- `metrics.controller.ts` — `MetricsController`, `GET /metrics`,
  unversioned/unprefixed (`VERSION_NEUTRAL` + `bootstrap/api-routing.ts`'s
  own `exclude` list) — the de facto standard scrape path, same treatment
  `HealthController`'s `/health/*` already gets. `@SkipThrottle()` — a
  Prometheus server scrapes on a fixed short interval from one source,
  same reasoning as orchestrator health-check polling. `@ApiExcludeController()`
  — an ops/infra surface, not documented alongside business API routes.
  Guarded by an inline bearer-token check (`METRICS_TOKEN`, `monitoring`
  config namespace) — no dedicated guard class, since there's exactly one
  route here. Unset token (only possible outside production —
  `env.validation.ts`'s own superRefine enforces this) means no auth
  required.
- `metrics.module.ts` — `MetricsModule`, `@Global()`, same precedent as
  `TokenModule`/`PasswordModule`/`CacheModule`/`JobsModule` — consumed by
  `HttpLoggingMiddleware` (`common/middleware/`), `PrismaService`
  (`database/`), and `InMemoryDeadLetterStore` (`jobs/`), none of which
  import this module themselves.
- `apps/api/src/config/monitoring/monitoring.config.ts` — the `monitoring`
  namespace (`metricsEnabled`, `metricsToken`), backed by
  `METRICS_ENABLED`/`METRICS_TOKEN` (`env.validation.ts`). Production
  safety check (superRefine): `METRICS_TOKEN` must be set when
  `METRICS_ENABLED` is true in production — the inverse shape of
  `SWAGGER_ENABLED`'s own check (metrics should stay ON in production;
  the gate is "protected," not "off by default"). See that config
  domain's own README for what else lives (or doesn't) in this folder.

## What this module explicitly does NOT do

No alerting (PagerDuty/Opsgenie/Slack/webhook dispatch) — audited,
confirmed zero integration and zero even-blank-placeholder env var exists
for one (unlike `SENTRY_DSN`/`OTEL_EXPORTER_OTLP_ENDPOINT`, which are at
least documented placeholders). Building real dispatch logic with
nothing configured to send to would be speculative, unverifiable
infrastructure — deferred with this reasoning documented, not silently
dropped. No Grafana dashboards — no Prometheus/Grafana stack is
deployable/verifiable in this project's own dev sandbox (no Docker
available), so shipping dashboard JSON with no way to render or validate
it against real scraped data isn't a genuine deliverable; `GET /metrics`
is the enabling foundation for whenever that stack exists. No uptime/
synthetic monitoring — that's an external-service-polls-`/health/live`
deploy-topology concern, not application code; nothing to build here.
See `docs/architecture/operations.md`'s Module 6 entry for the full
reasoning on each deferral.
