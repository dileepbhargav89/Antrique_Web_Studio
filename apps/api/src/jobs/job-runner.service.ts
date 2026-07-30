import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { LOGGER, Logger } from '../logging';
import { Job } from './interfaces/job.interface';
import { DeadLetterStore } from './interfaces/dead-letter-store.interface';
import { DEAD_LETTER_STORE } from './jobs.tokens';
import { JobContext } from './types/job-context.type';
import { JobResult } from './types/job-result.type';
import {
  DEFAULT_RETRY_POLICY,
  RetryPolicy,
  delayBeforeNextAttemptMs,
  hasAttemptsRemaining,
} from './retry-policy';
import { MetricsService } from '../metrics/metrics.service';

// "Job runner abstraction" (Milestone 14) — in-process, sequential
// execution of a single Job.execute() call with retry-on-failure and a
// dead-letter fallback once retries are exhausted. No scheduler, no queue,
// no concurrency control beyond what a caller's own `await run(...)`
// already gives it — deliberately: this milestone builds the shapes a
// real queue-backed runner would need to satisfy (Job/JobContext/
// JobResult/RetryPolicy/DeadLetterStore), not a working scheduler, so a
// future Redis/BullMQ-backed implementation is a drop-in replacement for
// THIS class alone, not a redesign of everything that would call it.
//
// Reuses LOGGER directly (not AUDIT_LOGGER — a job attempt/failure is
// operational telemetry, not an access-control/compliance event) — same
// "which of the two logging mechanisms fits this call site" judgment call
// documented in docs/architecture/security.md §9 for the auth/authz case,
// applied here for jobs instead.
@Injectable()
export class JobRunner {
  constructor(
    @Inject(LOGGER) private readonly logger: Logger,
    @Inject(DEAD_LETTER_STORE) private readonly deadLetterStore: DeadLetterStore,
    private readonly metrics: MetricsService,
  ) {}

  async run<T>(
    job: Job<T>,
    payload: T,
    retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY,
  ): Promise<JobResult> {
    const jobId = randomUUID();
    const scheduledAt = new Date();
    let attempt = 1;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const context: JobContext = { jobId, attempt, scheduledAt };
      this.logger.info('Job attempt starting', { jobName: job.name, jobId, attempt });

      try {
        await job.execute(payload, context);
        this.logger.info('Job succeeded', { jobName: job.name, jobId, attempt });
        this.metrics.recordJobExecution(job.name, 'succeeded');
        return { status: 'succeeded', attempts: attempt };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn('Job attempt failed', {
          jobName: job.name,
          jobId,
          attempt,
          error: message,
        });

        if (!hasAttemptsRemaining(retryPolicy, attempt)) {
          this.deadLetterStore.record({
            jobName: job.name,
            context,
            error: message,
            failedAt: new Date(),
          });
          this.logger.error('Job exhausted retries — moved to dead-letter store', {
            jobName: job.name,
            jobId,
            attempts: attempt,
            error: message,
          });
          this.metrics.recordJobExecution(job.name, 'dead_letter');
          return { status: 'dead_letter', attempts: attempt, error: message };
        }

        // No sleep/timer in the retry loop itself — a caller that awaits
        // run() awaits this delay too, which is correct for this
        // milestone's own "infrastructure only, no scheduler" scope: a
        // real scheduled/queued runner would reschedule instead of
        // blocking, but nothing in this codebase drives that yet (see
        // this class's own header comment).
        await sleep(delayBeforeNextAttemptMs(retryPolicy, attempt));
        attempt += 1;
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
