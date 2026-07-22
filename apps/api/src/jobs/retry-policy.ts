// "Retry abstraction" (Milestone 14). A plain value object, not a
// service/DI token — a retry policy is configuration a job runner is
// handed, not a shared stateful dependency (no reason for two callers to
// need the SAME instance the way they need the SAME CacheService/LOGGER).
//
// Exponential backoff with a cap — the same shape as most production job
// systems (including BullMQ's own default), so a future migration to a
// real queue backend doesn't need to re-derive the policy semantics, only
// re-plug them into that backend's own retry config.
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
};

// attempt is 1-indexed (the attempt that just failed) — delayBeforeNextAttemptMs(1)
// is the wait before attempt 2 runs. Capped, not unbounded exponential growth:
// an unbounded backoff on a long-lived in-process runner (no persistence
// across restarts) would eventually delay a retry longer than the process
// itself is likely to stay up, which defeats the retry's own purpose.
export function delayBeforeNextAttemptMs(policy: RetryPolicy, attempt: number): number {
  const exponential = policy.baseDelayMs * 2 ** (attempt - 1);
  return Math.min(exponential, policy.maxDelayMs);
}

export function hasAttemptsRemaining(policy: RetryPolicy, attempt: number): boolean {
  return attempt < policy.maxAttempts;
}
