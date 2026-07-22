// "Job context" (Milestone 14) — what a Job.run() implementation receives.
// `attempt` (1-indexed) lets a job body branch on retry number without the
// runner needing a separate "is this a retry" flag; `jobId` is this
// codebase's own convention for a correlatable identifier (same role
// requestId/correlationId already play for an HTTP request — see
// logging/types/request-context.type.ts), generated once per run by
// JobRunner, not by the job itself.
export interface JobContext {
  readonly jobId: string;
  readonly attempt: number;
  readonly scheduledAt: Date;
}
