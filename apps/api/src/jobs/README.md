# Background job infrastructure

Real as of Milestone 14 (Production Infrastructure) — infrastructure only
at first, per that milestone's own explicit constraint: "No scheduled
business jobs. No Redis. No BullMQ. No RabbitMQ." **Phase 10, Module 7**
added this codebase's first real SCHEDULED consumer
(`modules/auth/jobs/session-cleanup.scheduler.ts`, `@Cron()` via
`@nestjs/schedule`, every 6 hours) — request-triggered fire-and-forget
consumers (`SendEmailJob`, Phase 7) already existed before that.

- `Job<T>` (`interfaces/job.interface.ts`) — the contract a real job
  implements: `name` + `execute(payload: T, context: JobContext)`.
- `JobRunner` (`job-runner.service.ts`, `@Global()` via `JobsModule`) — runs
  a `Job`, retrying on failure per a `RetryPolicy` (exponential backoff,
  capped — `retry-policy.ts`), recording to `DEAD_LETTER_STORE`
  (`DeadLetterStore` interface, `InMemoryDeadLetterStore` the one real
  implementation — process-local, lost on restart, same explicit trade-off
  `CacheService`, Milestone 12, already made) once retries are exhausted.
  Since Phase 10, Module 6, also records every terminal outcome
  (`succeeded`/`dead_letter`) to `MetricsService`'s `jobs_executions_total`
  counter — see `apps/api/src/metrics/README.md`.
- `JobContext`/`JobResult`/`JobStatus` (`types/`) — the shapes a job
  body/caller sees.

In-process and sequential — a caller does `await jobRunner.run(myJob,
payload)` directly (a request handler, fire-and-forget; or, since Module
7, a `@Cron()` handler). Still no queue, still no Redis-backed backend —
see `docs/architecture/operations.md`'s Module 7 entry for why that
stays deliberately out of scope (current job volume doesn't justify a
new worker-process deployment topology; `SessionCleanupScheduler`'s own
comment covers why its in-process, no-distributed-lock model is
sufficient for that specific job). A likely NEXT real consumer: retrying
a `FAILED` `Notification` (`modules/admin/notification.service.ts`
already has `markFailed()`/`retryCount` — see
`docs/architecture/backend.md`'s Milestone 11 entry) via a real
`NotificationRetryJob` built on `Job<T>` — still unbuilt. Migrating to a
real queue backend (Redis/BullMQ) later replaces `JobRunner`'s own
internals only — `Job`/`JobContext`/`RetryPolicy`/`DeadLetterStore` are
deliberately backend-agnostic (see each file's own header comment).
