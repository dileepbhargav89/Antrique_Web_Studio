import { HttpLoggingMiddleware } from './http-logging.middleware';
import { Logger, RequestContext, RequestContextService } from '../../logging';
import { MetricsService } from '../../metrics/metrics.service';
import { Request, Response } from 'express';

describe('HttpLoggingMiddleware', () => {
  // HttpLoggingMiddleware depends only on Logger (interface) and the real,
  // publicly-exported RequestContextService — never the internal
  // LoggerService (not exported from logging/index.ts on purpose; see
  // logging/README.md's "consumers depend on interfaces, never concrete
  // classes"). The mock `info` snapshots requestContext.getContext() at
  // call time to prove the context was genuinely active — LoggerService's
  // own auto-merge behavior is already covered by logger.service.spec.ts.
  const makeLogger = (): jest.Mocked<Logger> => ({
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  });

  // Phase 10, Module 6 (Monitoring) — a real MetricsService, not a mock:
  // its own local Registry (see that class's own comment) makes it cheap
  // and safe to construct fresh per test.
  const makeMiddleware = (
    logger: Logger,
    requestContext = new RequestContextService(),
    metrics = new MetricsService(),
  ) => {
    const middleware = new HttpLoggingMiddleware(logger, requestContext, metrics);
    return { middleware, requestContext, metrics };
  };

  // A fake Response whose 'finish' listener fires via a genuine async
  // boundary (setImmediate) scheduled at the moment .on('finish', ...) is
  // registered. This matters and is not incidental: AsyncLocalStorage only
  // propagates context to continuations that are actually tracked by
  // async_hooks (promises, timers, I/O callbacks) — NOT to a listener
  // manually invoked later via a plain, synchronous `.emit()` call from
  // unrelated code (e.g. a test body), which has no causal async_hooks
  // relationship to the original run() scope. A real Express `res` only
  // gets this right because Node's actual socket/stream internals are
  // genuinely async-tracked all the way through; scheduling the callback
  // via setImmediate right when it's registered (synchronously, from
  // inside HttpLoggingMiddleware's own `requestContext.run()` callback) is
  // what faithfully reproduces that same guarantee here — a plain
  // synchronous mock would silently pass or fail these tests for the
  // wrong reason.
  const makeRes = (statusCode = 200): { res: Response; finished: Promise<void> } => {
    let resolveFinished: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    const res = {
      statusCode,
      setHeader: jest.fn(),
      on: (event: string, cb: () => void) => {
        if (event === 'finish') {
          setImmediate(() => {
            cb();
            resolveFinished();
          });
        }
        return res;
      },
    } as unknown as Response;

    return { res, finished };
  };

  const makeReq = (overrides: Partial<Request> = {}): Request =>
    ({
      method: 'GET',
      path: '/widgets',
      ip: '127.0.0.1',
      headers: {},
      ...overrides,
    }) as unknown as Request;

  it('calls next() exactly once, synchronously', () => {
    const { middleware } = makeMiddleware(makeLogger());
    const next = jest.fn();
    const { res } = makeRes();

    middleware.use(makeReq(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not log before the response finishes', () => {
    const logger = makeLogger();
    const { middleware } = makeMiddleware(logger);
    const { res } = makeRes();

    middleware.use(makeReq(), res, jest.fn());

    expect(logger.info).not.toHaveBeenCalled();
  });

  it('logs exactly once, after the response finishes', async () => {
    const logger = makeLogger();
    const { middleware } = makeMiddleware(logger);
    const { res, finished } = makeRes(200);

    middleware.use(makeReq(), res, jest.fn());
    await finished;

    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it('passes only HTTP-specific fields as metadata — no requestId/correlationId/ip/userAgent duplication', async () => {
    const logger = makeLogger();
    const { middleware } = makeMiddleware(logger);
    const { res, finished } = makeRes(201);

    middleware.use(
      makeReq({ method: 'POST', path: '/widgets', ip: '10.0.0.5' } as Partial<Request>),
      res,
      jest.fn(),
    );
    await finished;

    const [, metadata] = logger.info.mock.calls[0]!;
    expect(metadata).toEqual(
      expect.objectContaining({ method: 'POST', path: '/widgets', statusCode: 201 }),
    );
    expect(metadata).not.toHaveProperty('requestId');
    expect(metadata).not.toHaveProperty('correlationId');
    expect(metadata).not.toHaveProperty('ip');
    expect(metadata).not.toHaveProperty('userAgent');
  });

  it('establishes a RequestContext (requestId/correlationId/ip/userAgent) active at the moment of the log call', async () => {
    const logger = makeLogger();
    let observedContext: RequestContext | undefined;
    logger.info.mockImplementation(() => {
      observedContext = requestContext.getContext();
    });
    const { middleware, requestContext } = makeMiddleware(logger);
    const { res, finished } = makeRes();

    middleware.use(
      makeReq({ ip: '10.0.0.5', headers: { 'user-agent': 'test-agent' } } as Partial<Request>),
      res,
      jest.fn(),
    );
    await finished;

    expect(observedContext).toEqual(
      expect.objectContaining({
        ip: '10.0.0.5',
        userAgent: 'test-agent',
        requestId: expect.any(String),
        correlationId: expect.any(String),
      }),
    );
  });

  it('measures a real, non-negative duration', async () => {
    const logger = makeLogger();
    const { middleware } = makeMiddleware(logger);
    const { res, finished } = makeRes();

    middleware.use(makeReq(), res, jest.fn());
    await finished;

    const [, metadata] = logger.info.mock.calls[0]!;
    const durationMs = (metadata as { durationMs: number }).durationMs;
    expect(typeof durationMs).toBe('number');
    expect(durationMs).toBeGreaterThanOrEqual(0);
  });

  it('generates requestId/correlationId when no headers are present', async () => {
    const logger = makeLogger();
    let observedContext: RequestContext | undefined;
    logger.info.mockImplementation(() => {
      observedContext = requestContext.getContext();
    });
    const { middleware, requestContext } = makeMiddleware(logger);
    const { res, finished } = makeRes();

    middleware.use(makeReq({ headers: {} } as Partial<Request>), res, jest.fn());
    await finished;

    expect(observedContext?.requestId).toEqual(expect.any(String));
    expect(observedContext?.correlationId).toEqual(expect.any(String));
  });

  it('generates requestId/correlationId when the headers are present but blank', async () => {
    const logger = makeLogger();
    let observedContext: RequestContext | undefined;
    logger.info.mockImplementation(() => {
      observedContext = requestContext.getContext();
    });
    const { middleware, requestContext } = makeMiddleware(logger);
    const { res, finished } = makeRes();

    middleware.use(
      makeReq({ headers: { 'x-request-id': '', 'x-correlation-id': '   ' } } as Partial<Request>),
      res,
      jest.fn(),
    );
    await finished;

    expect(observedContext?.requestId).toEqual(expect.any(String));
    expect(observedContext?.requestId).not.toBe('');
    expect(observedContext?.correlationId).toEqual(expect.any(String));
    expect(observedContext?.correlationId).not.toBe('   ');
  });

  it('echoes X-Request-Id/X-Correlation-Id back on the response, synchronously before next()', () => {
    const { middleware } = makeMiddleware(makeLogger());
    const { res } = makeRes();

    middleware.use(
      makeReq({ headers: { 'x-request-id': 'incoming-req-id' } } as Partial<Request>),
      res,
      jest.fn(),
    );

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'incoming-req-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-Id', expect.any(String));
  });

  it('reuses incoming x-request-id/x-correlation-id headers instead of generating new ones', async () => {
    const logger = makeLogger();
    let observedContext: RequestContext | undefined;
    logger.info.mockImplementation(() => {
      observedContext = requestContext.getContext();
    });
    const { middleware, requestContext } = makeMiddleware(logger);
    const { res, finished } = makeRes();

    middleware.use(
      makeReq({
        headers: { 'x-request-id': 'incoming-req-id', 'x-correlation-id': 'incoming-corr-id' },
      } as Partial<Request>),
      res,
      jest.fn(),
    );
    await finished;

    expect(observedContext?.requestId).toBe('incoming-req-id');
    expect(observedContext?.correlationId).toBe('incoming-corr-id');
  });

  // Milestone 12 (Performance Engineering) — "slow request logging."
  // `process.hrtime.bigint()` is mocked (not a real 1s+ `sleep` in a
  // unit test) to deterministically simulate an elapsed duration past
  // SLOW_REQUEST_THRESHOLD_MS, the same "control time, don't wait for
  // it" approach cache.service.spec.ts uses via jest's fake `Date.now()`.
  describe('slow request logging', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('logs an additional warn (alongside the normal info) when duration exceeds the slow-request threshold', async () => {
      const hrtimeSpy = jest
        .spyOn(process.hrtime, 'bigint')
        .mockReturnValueOnce(0n)
        .mockReturnValueOnce(1_500_000_000n); // 1500ms later
      const logger = makeLogger();
      const { middleware } = makeMiddleware(logger);
      const { res, finished } = makeRes();

      middleware.use(makeReq(), res, jest.fn());
      await finished;

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      const [message, metadata] = logger.warn.mock.calls[0]!;
      expect(message).toBe('Slow HTTP request');
      expect((metadata as { durationMs: number }).durationMs).toBeCloseTo(1500, 0);
      hrtimeSpy.mockRestore();
    });

    it('does not log a warn when duration stays under the slow-request threshold', async () => {
      const hrtimeSpy = jest
        .spyOn(process.hrtime, 'bigint')
        .mockReturnValueOnce(0n)
        .mockReturnValueOnce(50_000_000n); // 50ms later
      const logger = makeLogger();
      const { middleware } = makeMiddleware(logger);
      const { res, finished } = makeRes();

      middleware.use(makeReq(), res, jest.fn());
      await finished;

      expect(logger.warn).not.toHaveBeenCalled();
      hrtimeSpy.mockRestore();
    });
  });

  // Phase 10, Module 6 (Monitoring).
  describe('metrics recording', () => {
    it('records http_requests_total/http_request_duration_seconds using the matched route pattern', async () => {
      const { middleware, metrics } = makeMiddleware(makeLogger());
      const { res, finished } = makeRes(200);

      middleware.use(
        makeReq({
          method: 'GET',
          path: '/api/v1/widgets/abc123',
          route: { path: '/api/v1/widgets/:id' },
        } as unknown as Partial<Request>),
        res,
        jest.fn(),
      );
      await finished;

      const text = await metrics.getMetrics();
      expect(text).toContain(
        'http_requests_total{method="GET",route="/api/v1/widgets/:id",status_code="200"} 1',
      );
      // The raw path (with the real id in it) must never appear as a
      // label value — that would be the unbounded-cardinality anti-
      // pattern this middleware's own resolveRouteLabel() comment warns
      // against.
      expect(text).not.toContain('route="/api/v1/widgets/abc123"');
    });

    it('labels an unmatched request (404 — no req.route) as "unmatched", not the raw path', async () => {
      const { middleware, metrics } = makeMiddleware(makeLogger());
      const { res, finished } = makeRes(404);

      middleware.use(
        makeReq({ method: 'GET', path: '/api/v1/does-not-exist' } as Partial<Request>),
        res,
        jest.fn(),
      );
      await finished;

      const text = await metrics.getMetrics();
      expect(text).toContain(
        'http_requests_total{method="GET",route="unmatched",status_code="404"} 1',
      );
      expect(text).not.toContain('route="/api/v1/does-not-exist"');
    });
  });

  it("keeps two concurrent requests' contexts isolated", async () => {
    const logger = makeLogger();
    const observed: RequestContext[] = [];
    logger.info.mockImplementation(() => {
      const ctx = requestContext.getContext();
      if (ctx) observed.push(ctx);
    });
    const { middleware, requestContext } = makeMiddleware(logger);
    const { res: resA, finished: finishedA } = makeRes(200);
    const { res: resB, finished: finishedB } = makeRes(200);

    // Both requests enter the middleware before either finishes —
    // exercising the same overlap AsyncLocalStorage must keep isolated.
    middleware.use(
      makeReq({ headers: { 'x-request-id': 'req-a' } } as Partial<Request>),
      resA,
      jest.fn(),
    );
    middleware.use(
      makeReq({ headers: { 'x-request-id': 'req-b' } } as Partial<Request>),
      resB,
      jest.fn(),
    );

    await Promise.all([finishedA, finishedB]);

    expect(observed).toHaveLength(2);
    const requestIds = observed.map((c) => c.requestId);
    expect(requestIds).toContain('req-a');
    expect(requestIds).toContain('req-b');
  });
});
