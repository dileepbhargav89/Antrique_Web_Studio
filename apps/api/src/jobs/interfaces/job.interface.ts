import { JobContext } from '../types/job-context.type';

// "Job interface" (Milestone 14) — the one contract every future
// background job implements. Generic over its own input payload type `T`
// (a concrete job, e.g. a future `NotificationRetryJob`, fixes `T` to its
// own shape) — never `unknown`/`any`, so a real implementation gets full
// type-checking on its own `execute()` body without a cast.
//
// Deliberately minimal — no `schedule`/`cron` field, no `queue` name, no
// concurrency hint. This milestone builds infrastructure only ("No
// scheduled business jobs. No Redis. No BullMQ. No RabbitMQ.") — those
// concerns belong to whatever real scheduler/queue backend eventually
// drives JobRunner, not to the job contract itself, which should stay
// backend-agnostic (an in-process JobRunner today, a Redis-backed one
// later, both drive the exact same Job.execute() signature).
export interface Job<T = void> {
  readonly name: string;
  execute(payload: T, context: JobContext): Promise<void>;
}
