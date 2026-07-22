// "Job status" (Milestone 14). Mirrors the shape this codebase's own
// Notification delivery lifecycle already established (Milestone 11 —
// PENDING -> QUEUED -> SENT, or -> FAILED) rather than inventing a new
// vocabulary — a future real job consumer built on this infrastructure and
// a notification's own delivery record can be reasoned about with the same
// mental model.
export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'dead_letter';
