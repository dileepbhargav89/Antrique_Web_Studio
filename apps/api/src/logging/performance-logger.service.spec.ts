import { PerformanceLogger } from './performance-logger.service';
import { RequestContext, RequestContextService } from './index';
import { Logger } from './interfaces/logger.interface';

describe('PerformanceLogger', () => {
  const makeLogger = (): jest.Mocked<Logger> => ({
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  });

  describe('startTimer / endTimer', () => {
    it('logs operation, durationMs, and success: true by default', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      const timer = perf.startTimer('db-query');
      const durationMs = perf.endTimer(timer);

      expect(logger.info).toHaveBeenCalledTimes(1);
      const [message, metadata] = logger.info.mock.calls[0]!;
      expect(message).toBe('Performance measurement');
      expect(metadata).toEqual(
        expect.objectContaining({ operation: 'db-query', durationMs, success: true }),
      );
      expect(metadata).not.toHaveProperty('category');
    });

    it('includes category when provided at startTimer time', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      const timer = perf.startTimer('db-query', { category: 'database' });
      perf.endTimer(timer);

      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata).toEqual(expect.objectContaining({ category: 'database' }));
    });

    it('honors an explicit success: false override', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      const timer = perf.startTimer('flaky-op');
      perf.endTimer(timer, { success: false });

      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata).toEqual(expect.objectContaining({ success: false }));
    });

    it('merges caller-supplied metadata without letting it clobber the fixed fields', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      const timer = perf.startTimer('db-query');
      perf.endTimer(timer, {
        metadata: { rowCount: 42, operation: 'SHOULD NOT WIN', durationMs: -1, success: 'nope' },
      });

      const [, metadata] = logger.info.mock.calls[0]!;
      expect((metadata as { rowCount: number }).rowCount).toBe(42);
      expect(metadata!.operation).toBe('db-query');
      expect(typeof metadata!.durationMs).toBe('number');
      expect(metadata!.durationMs).not.toBe(-1);
      expect(metadata!.success).toBe(true);
    });

    it('protects the category field the same way, not just operation/durationMs/success', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      const timer = perf.startTimer('db-query', { category: 'database' });
      perf.endTimer(timer, { metadata: { category: 'SHOULD NOT WIN' } });

      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata!.category).toBe('database');
    });

    it('returns the measured duration', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      const timer = perf.startTimer('op');
      const returned = perf.endTimer(timer);

      const [, metadata] = logger.info.mock.calls[0]!;
      expect(returned).toBe(metadata!.durationMs);
    });
  });

  describe('measure', () => {
    it("returns the wrapped function's result and logs exactly once with success: true", () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      const result = perf.measure('compute', () => 42);

      expect(result).toBe(42);
      expect(logger.info).toHaveBeenCalledTimes(1);
      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata).toEqual(expect.objectContaining({ operation: 'compute', success: true }));
    });

    it('rethrows the exact error and logs exactly once with success: false', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);
      const error = new Error('boom');

      expect(() =>
        perf.measure('compute', () => {
          throw error;
        }),
      ).toThrow(error);

      expect(logger.info).toHaveBeenCalledTimes(1);
      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata).toEqual(expect.objectContaining({ operation: 'compute', success: false }));
    });

    it('passes category and metadata through to the log entry', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      perf.measure('compute', () => 1, { category: 'cpu', metadata: { input: 'x' } });

      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata).toEqual(
        expect.objectContaining({ category: 'cpu', input: 'x', operation: 'compute' }),
      );
    });

    it('protects category/operation/success from a colliding key in its own metadata option', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      perf.measure('compute', () => 1, {
        category: 'cpu',
        metadata: { category: 'SHOULD NOT WIN', operation: 'SHOULD NOT WIN', success: 'nope' },
      });

      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata).toEqual(
        expect.objectContaining({ category: 'cpu', operation: 'compute', success: true }),
      );
    });

    it('rejects an async function at compile time (typecheck-only, not a runtime test)', () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);
      // Compile-time guard, not a runtime assertion: measure() rejects an
      // async function at the type level (see performance-logger.service.ts's
      // `T extends Promise<unknown> ? never : T` constraint) — passing one
      // would otherwise silently truncate durationMs to the synchronous
      // portion and log success: true regardless of a later rejection.
      // @ts-expect-error — async () => ... returns a Promise, which
      // measure()'s signature deliberately rejects; must NOT compile.
      perf.measure('bad', async () => 1);
    });
  });

  describe('measureAsync', () => {
    it('returns the resolved value and logs exactly once with success: true', async () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      const result = await perf.measureAsync('fetch', async () => 'done');

      expect(result).toBe('done');
      expect(logger.info).toHaveBeenCalledTimes(1);
      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata).toEqual(expect.objectContaining({ operation: 'fetch', success: true }));
    });

    it('rethrows the exact rejection and logs exactly once with success: false', async () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);
      const error = new Error('async boom');

      await expect(
        perf.measureAsync('fetch', async () => {
          throw error;
        }),
      ).rejects.toBe(error);

      expect(logger.info).toHaveBeenCalledTimes(1);
      const [, metadata] = logger.info.mock.calls[0]!;
      expect(metadata).toEqual(expect.objectContaining({ operation: 'fetch', success: false }));
    });

    it('measures a real, non-negative duration across a genuine async delay', async () => {
      const logger = makeLogger();
      const perf = new PerformanceLogger(logger);

      await perf.measureAsync('delayed', async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });

      const [, metadata] = logger.info.mock.calls[0]!;
      const durationMs = metadata!.durationMs as number;
      expect(typeof durationMs).toBe('number');
      // Loose lower bound — real timer, not an exact-timing assertion.
      expect(durationMs).toBeGreaterThanOrEqual(15);
    });
  });

  describe('RequestContext inheritance', () => {
    it('logs from within whatever RequestContext is active — proving inheritance via the real RequestContextService', () => {
      const logger = makeLogger();
      let observedContext: RequestContext | undefined;
      logger.info.mockImplementation(() => {
        observedContext = requestContext.getContext();
      });
      const requestContext = new RequestContextService();
      const perf = new PerformanceLogger(logger);

      requestContext.run({ requestId: 'req-1', correlationId: 'corr-1' }, () => {
        perf.measure('compute', () => 1);
      });

      expect(observedContext).toEqual({ requestId: 'req-1', correlationId: 'corr-1' });
    });

    it('logs with no context when none is active — works independently of HTTP middleware', () => {
      const logger = makeLogger();
      let observedContext: RequestContext | undefined = {
        requestId: 'stale',
        correlationId: 'stale',
      };
      const requestContext = new RequestContextService();
      logger.info.mockImplementation(() => {
        observedContext = requestContext.getContext();
      });
      const perf = new PerformanceLogger(logger);

      perf.measure('background-job', () => 1);

      expect(observedContext).toBeUndefined();
    });
  });
});
