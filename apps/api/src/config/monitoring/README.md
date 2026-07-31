# Monitoring configuration

**Real as of Phase 10, Module 6** — `monitoring.config.ts` registers the
`monitoring` namespace (`metricsEnabled`, `metricsToken`), consumed by
`apps/api/src/metrics/` (`GET /metrics`, Prometheus exposition format).
See `apps/api/src/metrics/README.md`.

**Sentry is real too, as of Phase 10, Module 8's revisit** —
`monitoring.config.ts` also exposes `sentryDsn`/`appVersion`/`nodeEnv`,
consumed by `apps/api/src/monitoring/sentry.ts` (`initSentry()`, called
directly from `main.ts` with `validateEnv()`'s own return value — Sentry
needs to init before DI is available). See that file's own header comment
and `ExceptionLoggingFilter` for what gets reported and what doesn't.

**Still a placeholder:** OpenTelemetry exporter endpoint —
`.env.example`'s `OTEL_EXPORTER_OTLP_ENDPOINT` remains blank and unread by
any code. Deliberately deferred (Phase 10, Module 5) — no tracing backend
is configured in any environment this app deploys to, and this is a
single-service monolith, so the value a span adds over the already-real
`requestId`/`correlationId` propagation is real only once that changes;
see `apps/api/src/logging/README.md`'s "Future extension points" for the
full reasoning. Not this module's job to build.
