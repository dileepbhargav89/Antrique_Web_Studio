import { JobContext } from '../types/job-context.type';

export interface DeadLetterEntry {
  readonly jobName: string;
  readonly context: JobContext;
  readonly error: string;
  readonly failedAt: Date;
}

// "Dead-letter abstraction" (Milestone 14) — an interface, not just the
// in-memory implementation below, so a real queue backend can later supply
// its own (e.g. a Redis list, a database table) without JobRunner's own
// code changing — the same swap-point pattern this codebase already uses
// for LOGGER/LOG_TRANSPORT/AUDIT_LOGGER (logging/), not a new one invented
// for this milestone.
export interface DeadLetterStore {
  record(entry: DeadLetterEntry): void;
  list(): readonly DeadLetterEntry[];
  clear(): void;
}
