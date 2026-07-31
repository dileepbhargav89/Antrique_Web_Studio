import { Logger } from '../logging';
import { MetricsService } from '../metrics/metrics.service';
import { isRetryableTransactionError, isStatementTimeoutError } from '../utils/prisma-error.util';
import { RetryPolicy, delayBeforeNextAttemptMs, hasAttemptsRemaining } from '../jobs/retry-policy';

// Phase 10, Module 9 (DB Reliability) — DB-specific, not job-specific:
// `jobs/retry-policy.ts`'s own `DEFAULT_RETRY_POLICY` (up to a 30s cap) is
// tuned for a background job nobody is actively waiting on. A request a
// user IS waiting on can't tolerate that — small, fast delays instead, same
// exponential-with-cap shape via the shared `RetryPolicy` type/helpers
// (`hasAttemptsRemaining`/`delayBeforeNextAttemptMs`), just a different
// instance. `jobs/retry-policy.ts` itself is intentionally left unmodified.
export const DB_TRANSACTION_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 20,
  maxDelayMs: 200,
};

// Wraps a single `PrismaService` transaction attempt (a `rawTxClient
// .$transaction(...)` call — see prisma.service.ts's constructor hook and
// its `$transaction()` override, the only two real call sites) with
// retry-on-transient-failure. Safe specifically because it retries at the
// TRANSACTION boundary: a failed transaction has committed nothing, by
// Postgres's own definition of the SQLSTATEs `isRetryableTransactionError()`
// checks for (see that function's own comment) — retrying re-runs `attempt`
// from scratch, it does not resume partial work.
//
// A caller-supplied `attempt()` whose callback has non-DB side effects
// (e.g. an email send) WOULD be double-executed by a retry — spot-checked
// against every real `$transaction(async (tx) => ...)` call site in this
// codebase at the time this was written (quotation/lead/order/follow-up/
// payment services) and none do that today, but this is not structurally
// enforced here.
export async function withTransactionRetry<T>(
  attempt: () => Promise<T>,
  deps: { metrics: MetricsService; logger: Logger },
  policy: RetryPolicy = DB_TRANSACTION_RETRY_POLICY,
): Promise<T> {
  let attemptNumber = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await attempt();
      if (attemptNumber > 1) {
        deps.metrics.recordDbTransactionRetry('succeeded_after_retry');
      }
      return result;
    } catch (error) {
      if (isStatementTimeoutError(error)) {
        // Terminal, never retried — retrying an already-too-slow query
        // just repeats the same timeout (see isStatementTimeoutError()'s
        // own comment).
        deps.logger.warn('Database statement timeout', { attempt: attemptNumber });
        deps.metrics.recordDbTransactionRetry('timed_out');
        throw error;
      }

      if (!isRetryableTransactionError(error)) {
        throw error;
      }

      if (!hasAttemptsRemaining(policy, attemptNumber)) {
        deps.logger.error('Database transaction retries exhausted', {
          attempts: attemptNumber,
        });
        deps.metrics.recordDbTransactionRetry('exhausted');
        throw error;
      }

      deps.logger.warn('Retrying database transaction after a transient error', {
        attempt: attemptNumber,
      });
      deps.metrics.recordDbTransactionRetry('retried');
      await sleep(delayBeforeNextAttemptMs(policy, attemptNumber));
      attemptNumber += 1;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
