import { Injectable } from '@nestjs/common';
import { Job, JobContext } from '../../../jobs';
import { SessionRepository } from '../repositories/session.repository';

// Phase 10, Module 7 (Background Jobs) — this codebase's first genuinely
// SCHEDULED job (every prior `JobRunner` call site is request-triggered,
// fire-and-forget — see `email/jobs/send-email.job.ts`). Wrapped in the
// same `Job<T>` contract as `SendEmailJob` on purpose: it gets retry/
// backoff/dead-letter for free, the same infrastructure a request-
// triggered job already gets, even though what drives THIS job
// (`SessionCleanupScheduler`'s `@Cron()`) is different from what drives
// that one (an HTTP request handler).
@Injectable()
export class SessionCleanupJob implements Job<void> {
  readonly name = 'session-cleanup';

  constructor(private readonly sessionRepository: SessionRepository) {}

  async execute(_payload: void, _context: JobContext): Promise<void> {
    await this.sessionRepository.deleteExpired();
  }
}
