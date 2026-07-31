import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

// Phase 10, Module 6 (Monitoring) — the first metrics-collection surface
// this codebase has. A LOCAL `Registry` instance, never prom-client's own
// module-level default `register` singleton: the default registry is
// process-global mutable state shared across every `new Metric(...)` call
// anywhere in the process, so a second `MetricsService` instantiation
// (e.g. Jest constructing this class fresh in more than one spec file
// within the same worker) would throw "A metric with the name ... has
// already been registered" against the shared singleton. A local registry
// makes every instance independently constructible and testable, with
// zero cross-instance/cross-test interference — the same reasoning
// `InMemoryDeadLetterStore`/`CacheService` already apply to their own
// process-local state, just for prom-client's registry instead.
@Injectable()
export class MetricsService {
  private readonly registry = new Registry();

  private readonly httpRequestsTotal: Counter<'method' | 'route' | 'status_code'>;
  private readonly httpRequestDurationSeconds: Histogram<'method' | 'route' | 'status_code'>;
  private readonly dbQueryDurationSeconds: Histogram<never>;
  private readonly deadLetterQueueSize: Gauge<never>;
  private readonly jobExecutionsTotal: Counter<'job_name' | 'status'>;
  private readonly cacheOperationsTotal: Counter<'cache_name' | 'result'>;

  constructor() {
    // Node process/event-loop/GC metrics (heap, CPU, event-loop lag,
    // active handles) — prom-client's own standard set, the same class of
    // signal `GET /admin/runtime` already exposes a single-shot snapshot
    // of (`uptime`), but scrape-able over time instead of one-shot.
    collectDefaultMetrics({ register: this.registry });

    // Cardinality note (applies to both metrics below): labeled by
    // `route` — the MATCHED Express route pattern (`/api/v1/orders/:id`),
    // never the raw request path with real IDs interpolated in. Labeling
    // by raw path would give every distinct order/product/lead id its own
    // time series — unbounded cardinality that grows forever and can
    // exhaust a real Prometheus server's memory. See
    // `HttpLoggingMiddleware`'s own comment for how `route` is derived
    // (`req.route?.path`, falling back to a fixed `'unmatched'` label for
    // 404s rather than the raw path, for the same reason).
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests handled, labeled by method/route/status_code',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds, labeled by method/route/status_code',
      labelNames: ['method', 'route', 'status_code'],
      // Seconds, not milliseconds — Prometheus's own convention for
      // duration metrics (https://prometheus.io/docs/practices/naming/).
      // Bucket boundaries span this app's own real observed range: sub-
      // 5ms simple reads up through the ~10s tail
      // `docs/architecture/performance.md`'s benchmark runs recorded for
      // the heaviest endpoints, plus headroom above that for a genuine
      // outlier without every slow request collapsing into one +Inf bucket.
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // Unlabeled (Prisma's own query event carries no route/model
    // information cheaply available at the $on('query', ...) call site —
    // see prisma.service.ts) — a single aggregate distribution across all
    // queries, same scope as that file's own existing
    // SLOW_QUERY_THRESHOLD_MS log-based signal, now also queryable as
    // percentiles instead of only a fixed 100ms cutoff.
    this.dbQueryDurationSeconds = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Prisma database query duration in seconds, across all models/operations',
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [this.registry],
    });

    // Closes the exact gap `docs/architecture/operations.md` §8 already
    // named by title ("dead-letter alerting, retry-exhaustion
    // monitoring... have an obvious place to extend this document when
    // that day comes") — a real gauge now exists for whenever a real job
    // starts populating `InMemoryDeadLetterStore` (currently zero jobs
    // run — Module 7's scope, not this one's).
    this.deadLetterQueueSize = new Gauge({
      name: 'jobs_dead_letter_queue_size',
      help: 'Current number of entries in the in-process dead-letter store',
      registers: [this.registry],
    });

    // Phase 10, Module 7 (Background Jobs) — every `JobRunner.run()`
    // call's terminal outcome (`succeeded` or `dead_letter` — the only
    // two `JobResult.status` values `run()` itself ever returns; `failed`
    // attempts that still have retries left are deliberately NOT counted
    // here, only the final result of the whole retry sequence). Labeled
    // by `job_name` — a fixed, small set of real job names (`send-email`,
    // `session-cleanup`, ...), not a cardinality risk the way HTTP route
    // labeling could be if done wrong (see that metric's own comment).
    this.jobExecutionsTotal = new Counter({
      name: 'jobs_executions_total',
      help: 'Total number of JobRunner.run() calls, by job name and terminal status',
      labelNames: ['job_name', 'status'],
      registers: [this.registry],
    });

    // Phase 10, Module 8 (Caching) — labeled by `cache_name`, the
    // NAMESPACE segment of a `CacheService` key (`"<namespace>:<rest>"`,
    // e.g. `"tenant-resolve"`/`"role-keys"`/`"dashboard-overview"`),
    // never the full key — the full key includes a tenantId/email/date
    // range, which would be the exact unbounded-cardinality mistake this
    // codebase already guards against for HTTP route labeling (see
    // `http_requests_total`'s own comment). A fixed, small set of real
    // cache namespaces is safe to label by directly.
    this.cacheOperationsTotal = new Counter({
      name: 'cache_operations_total',
      help: "Total number of CacheService.getOrLoad() calls, by the key's namespace and hit/miss",
      labelNames: ['cache_name', 'result'],
      registers: [this.registry],
    });
  }

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationMs / 1000);
  }

  recordDbQuery(durationMs: number): void {
    this.dbQueryDurationSeconds.observe(durationMs / 1000);
  }

  setDeadLetterQueueSize(size: number): void {
    this.deadLetterQueueSize.set(size);
  }

  recordJobExecution(jobName: string, status: 'succeeded' | 'dead_letter'): void {
    this.jobExecutionsTotal.inc({ job_name: jobName, status });
  }

  recordCacheOperation(cacheName: string, result: 'hit' | 'miss'): void {
    this.cacheOperationsTotal.inc({ cache_name: cacheName, result });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
