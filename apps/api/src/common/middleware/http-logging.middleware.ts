import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LOGGER, Logger, RequestContext, RequestContextService } from '../../logging';
import { MetricsService } from '../../metrics/metrics.service';

// Phase 10, Module 6 (Monitoring) — the matched Express ROUTE PATTERN
// (`/api/v1/orders/:id`), never the raw request path with real ids
// interpolated in (`/api/v1/orders/a1b2c3...`). `req.route` is populated
// by Express's own router once a request actually matches a registered
// route — by the time this fires (inside the `res.on('finish', ...)`
// handler below, after the full request/response cycle including
// controller execution), it's set for every successfully-routed request.
// A request that matches NOTHING (a 404 — no controller ever handled it)
// gets a fixed `'unmatched'` label instead of the raw path — labeling
// 404s by their raw path would let an attacker probing random paths
// generate unbounded label cardinality in a real Prometheus server, the
// exact anti-pattern `MetricsService`'s own comment warns about for this
// same reason.
function resolveRouteLabel(req: Request): string {
  return req.route?.path ? String(req.route.path) : 'unmatched';
}

// Milestone 12 (Performance Engineering) — "slow request logging." Same
// rough magnitude as PrismaService's own SLOW_QUERY_THRESHOLD_MS (100ms)
// but an order higher — a single request legitimately runs several
// queries plus its own service-layer work, so the bar for "the WHOLE
// request is worth flagging" is naturally higher than "one query is."
const SLOW_REQUEST_THRESHOLD_MS = 1000;

// The first real call site for LOGGER/RequestContextService — everything
// before this phase proved the mechanism by hand. Implements NestMiddleware
// for typing/DI convenience, but is registered via raw `app.use()` in
// main.ts, NOT NestModule.configure()/MiddlewareConsumer —
// `consumer.apply(...).forRoutes('*')` turned out to scope matching to
// app.setGlobalPrefix()'s prefix (confirmed by direct testing: requests
// outside /api/v1/*, e.g. a future unprefixed /health endpoint, silently
// never reached it). `app.use()` at the Express/HTTP-adapter level runs
// for every request regardless of that prefix — see main.ts.
//
// Deliberately does NOT re-pass requestId/correlationId/ip/userAgent as
// log metadata — LoggerService already auto-merges the active
// RequestContext into LogEntry.context (Phase 1.2C.4). Only the HTTP-
// specific fields context doesn't carry (method/path/statusCode/
// durationMs) go in `metadata`. Duplicating the other 4 fields into
// metadata too would work against the whole point of what 1.2C.4 built.
@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  constructor(
    @Inject(LOGGER) private readonly logger: Logger,
    private readonly requestContext: RequestContextService,
    private readonly metrics: MetricsService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();

    const requestId = firstHeader(req.headers['x-request-id']) ?? randomUUID();
    const correlationId = firstHeader(req.headers['x-correlation-id']) ?? randomUUID();
    const ip = req.ip;
    const userAgent = firstHeader(req.headers['user-agent']);

    const context: RequestContext = {
      requestId,
      correlationId,
      ...(ip !== undefined ? { ip } : {}),
      ...(userAgent !== undefined ? { userAgent } : {}),
    };

    // Milestone 14 (Production Infrastructure) — "Correlation IDs must
    // propagate through..." was already true internally (every log call
    // auto-merges this same context, see LoggerService) since Phase
    // 1.2C.4; this is the one piece that was missing — echoing the IDs
    // back to the CALLER, not just threading them through this process's
    // own logs. Set before `next()`, not in the `res.on('finish', ...)`
    // handler below — response headers must be set before the response
    // starts sending, and a caller tracing an in-flight request (e.g. to
    // correlate its own client-side logs while the request is still
    // pending) benefits from having the id available immediately, not
    // only after the response completes.
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Correlation-Id', correlationId);

    // Registering the 'finish' listener synchronously inside run()'s
    // callback — and calling next() synchronously inside that same
    // callback — is what makes AsyncLocalStorage propagate this context
    // to everything the request touches downstream, including this
    // listener firing later once the response actually completes.
    this.requestContext.run(context, () => {
      res.on('finish', () => {
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        const metadata = {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs,
        };

        this.logger.info('HTTP request completed', metadata);
        // "Slow request logging" (Milestone 12 — Performance
        // Engineering) — a SECOND, `warn`-level entry alongside the
        // existing `info` one above (never a replacement for it — every
        // request still gets its normal completion log), so a slow
        // request is findable by log level alone without parsing
        // `durationMs` out of every "HTTP request completed" line.
        if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
          this.logger.warn('Slow HTTP request', metadata);
        }

        // Phase 10, Module 6 (Monitoring) — the exact same `durationMs`/
        // `statusCode` already computed above, additionally recorded as
        // a metric (queryable percentiles/rates over time via
        // GET /metrics), not a replacement for the log lines above,
        // which stay the per-event, grep-one-incident record — see
        // `docs/architecture/operations.md`'s Module 6 entry.
        this.metrics.recordHttpRequest(
          req.method,
          resolveRouteLabel(req),
          res.statusCode,
          durationMs,
        );
      });

      next();
    });
  }
}

// Express header values can be string | string[] | undefined (arrays for
// repeated headers) — normalize to the first value, or undefined. A blank
// or whitespace-only value counts as absent, not "present but empty": a
// misbehaving client/proxy sending `x-request-id: ` (empty) would
// otherwise pass `?? randomUUID()`'s nullish check (empty string isn't
// null/undefined) and leave a useless blank requestId/correlationId
// threaded through the entire request's context and logs instead of a
// real generated one.
function firstHeader(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first !== undefined && first.trim().length > 0 ? first : undefined;
}
