// Phase 10, Module 6 (Monitoring) — the request header `GET /metrics`
// checks against the `monitoring` config namespace's `metricsToken`
// (env.validation.ts's `METRICS_TOKEN`). Prometheus's own scrape-config
// `bearer_token`/`authorization` options send exactly this shape
// (`Authorization: Bearer <token>`) — matching that rather than inventing
// a metrics-specific header means a real Prometheus server's stock config
// works against this endpoint with zero custom headers.
export const METRICS_AUTH_HEADER = 'authorization';
export const METRICS_BEARER_PREFIX = 'Bearer ';
