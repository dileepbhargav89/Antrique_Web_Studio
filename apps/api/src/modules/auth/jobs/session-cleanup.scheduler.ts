import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobRunner } from '../../../jobs';
import { SessionCleanupJob } from './session-cleanup.job';

// Phase 10, Module 7 (Background Jobs) — the first `@Cron()`-driven
// caller of `JobRunner` in this codebase (see `jobs/README.md`'s own
// "no scheduler, no queue, no cron" — that gap, for this one job).
// `@nestjs/schedule`, not a Redis-backed scheduler/queue (BullMQ etc.):
// this is a single, idempotent, no-payload, no-cross-instance-
// coordination-needed job — running it more than once (a brief overlap
// window across a multi-instance deployment, or a missed tick) is
// harmless, it just deletes zero rows the second time. That's exactly
// the case `@nestjs/schedule`'s own in-process, per-instance timer is
// sufficient for; a distributed lock/exactly-once guarantee would be
// solving a problem this job doesn't have. See
// `docs/architecture/operations.md`'s Module 7 entry for the fuller
// reasoning on why a real queue backend stays out of scope.
//
// Every 6 hours, not more/less often: `Session.expiresAt` follows the
// refresh-token TTL (30 days, `jwt.config.ts`'s own
// `JWT_REFRESH_TOKEN_TTL`) — nothing about that timescale needs
// minute-level cleanup precision, and a shorter interval only adds
// scrape-visible `db_query_duration_seconds` noise for a `DELETE` that,
// most runs, deletes very few or zero rows.
@Injectable()
export class SessionCleanupScheduler {
  constructor(
    private readonly jobRunner: JobRunner,
    private readonly sessionCleanupJob: SessionCleanupJob,
  ) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async run(): Promise<void> {
    await this.jobRunner.run(this.sessionCleanupJob, undefined);
  }
}
