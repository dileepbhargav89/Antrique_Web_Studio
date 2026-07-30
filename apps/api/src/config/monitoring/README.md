# Monitoring configuration

**Real as of Phase 10, Module 6** — `monitoring.config.ts` registers the
`monitoring` namespace (`metricsEnabled`, `metricsToken`), consumed by
`apps/api/src/metrics/` (`GET /metrics`, Prometheus exposition format).
See `apps/api/src/metrics/README.md`.

**Still a placeholder:** Sentry DSN / OpenTelemetry exporter endpoint —
`.env.example`'s `SENTRY_DSN`/`OTEL_EXPORTER_OTLP_ENDPOINT` remain blank
and unread by any code. Deliberately deferred (Phase 10, Module 5) — no
APM/tracing backend is configured in any environment this app deploys
to; see `apps/api/src/logging/README.md`'s "Future extension points"
for the full reasoning. Not this module's job to build.
