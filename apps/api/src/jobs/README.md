# Background job infrastructure

Real as of Milestone 14 (Production Infrastructure) — infrastructure only,
per that milestone's own explicit constraint: "No scheduled business jobs.
No Redis. No BullMQ. No RabbitMQ." Zero real jobs are registered anywhere
in this codebase yet.

- `Job<T>` (`interfaces/job.interface.ts`) — the contract a future real job
  implements: `name` + `execute(payload: T, context: JobContext)`.
- `JobRunner` (`job-runner.service.ts`, `@Global()` via `JobsModule`) — runs
  a `Job`, retrying on failure per a `RetryPolicy` (exponential backoff,
  capped — `retry-policy.ts`), recording to `DEAD_LETTER_STORE`
  (`DeadLetterStore` interface, `InMemoryDeadLetterStore` the one real
  implementation — process-local, lost on restart, same explicit trade-off
  `CacheService`, Milestone 12, already made) once retries are exhausted.
- `JobContext`/`JobResult`/`JobStatus` (`types/`) — the shapes a job
  body/caller sees.

In-process and sequential — a caller does `await jobRunner.run(myJob,
payload)` directly; there is no scheduler, no queue, no cron. A likely
first real consumer once one is needed: retrying a `FAILED` `Notification`
(`modules/admin/notification.service.ts` already has `markFailed()`/
`retryCount` — see `docs/architecture/backend.md`'s Milestone 11 entry) via
a real `NotificationRetryJob` built on `Job<T>`. Migrating to a real queue
backend (Redis/BullMQ) later replaces `JobRunner`'s own internals only —
`Job`/`JobContext`/`RetryPolicy`/`DeadLetterStore` are deliberately
backend-agnostic (see each file's own header comment).
