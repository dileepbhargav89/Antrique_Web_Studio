import { Prisma } from '../../generated/prisma/client';
import { Logger } from '../logging';
import { MetricsService } from '../metrics/metrics.service';
import { withTransactionRetry } from './db-transaction-retry';

const FAST_RETRY_POLICY = { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1 };

function createDeps() {
  const logger: Logger = {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };
  // A real MetricsService, not a mock — see job-runner.service.spec.ts's
  // own createRunner() for the same reasoning (local Registry, cheap and
  // safe to construct fresh per test).
  const metrics = new MetricsService();
  return { logger, metrics };
}

// Live-verified shape (see prisma-error.util.spec.ts's own comment) for a
// real deadlock hit via a model-delegate operation — the unwrapped
// DriverAdapterError Prisma 7's client-engine-runtime actually throws, not
// the older architecture's P2034.
function writeConflictError(): { name: string; message: string; cause: { code: string } } {
  return { name: 'DriverAdapterError', message: 'deadlock detected', cause: { code: '40P01' } };
}

function constraintViolationError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('withTransactionRetry', () => {
  it('returns the result on the first successful attempt, without retrying', async () => {
    const { logger, metrics } = createDeps();
    const attempt = jest.fn().mockResolvedValue('ok');

    const result = await withTransactionRetry(attempt, { metrics, logger }, FAST_RETRY_POLICY);

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    const text = await metrics.getMetrics();
    expect(text).not.toMatch(/db_transaction_retries_total\{/);
  });

  it('retries a retryable error and succeeds on a later attempt', async () => {
    const { logger, metrics } = createDeps();
    const attempt = jest
      .fn()
      .mockRejectedValueOnce(writeConflictError())
      .mockResolvedValueOnce('ok');

    const result = await withTransactionRetry(attempt, { metrics, logger }, FAST_RETRY_POLICY);

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);
    const text = await metrics.getMetrics();
    expect(text).toContain('db_transaction_retries_total{outcome="retried"} 1');
    expect(text).toContain('db_transaction_retries_total{outcome="succeeded_after_retry"} 1');
  });

  it('rethrows a non-retryable error immediately, without retrying', async () => {
    const { logger, metrics } = createDeps();
    const attempt = jest.fn().mockRejectedValue(constraintViolationError());

    await expect(
      withTransactionRetry(attempt, { metrics, logger }, FAST_RETRY_POLICY),
    ).rejects.toThrow('Unique constraint failed');

    expect(attempt).toHaveBeenCalledTimes(1);
    const text = await metrics.getMetrics();
    expect(text).not.toMatch(/db_transaction_retries_total\{/);
  });

  it('stops retrying once maxAttempts is reached and records an exhausted outcome', async () => {
    const { logger, metrics } = createDeps();
    const attempt = jest.fn().mockRejectedValue(writeConflictError());

    await expect(
      withTransactionRetry(attempt, { metrics, logger }, FAST_RETRY_POLICY),
    ).rejects.toEqual(writeConflictError());

    expect(attempt).toHaveBeenCalledTimes(FAST_RETRY_POLICY.maxAttempts);
    const text = await metrics.getMetrics();
    expect(text).toContain('db_transaction_retries_total{outcome="exhausted"} 1');
    expect(text).toContain('db_transaction_retries_total{outcome="retried"} 2');
  });

  it('never retries a statement-timeout error, and records it distinctly', async () => {
    const { logger, metrics } = createDeps();
    const attempt = jest.fn().mockRejectedValue({ code: '57014' });

    await expect(
      withTransactionRetry(attempt, { metrics, logger }, FAST_RETRY_POLICY),
    ).rejects.toEqual({ code: '57014' });

    expect(attempt).toHaveBeenCalledTimes(1);
    const text = await metrics.getMetrics();
    expect(text).toContain('db_transaction_retries_total{outcome="timed_out"} 1');
  });
});
