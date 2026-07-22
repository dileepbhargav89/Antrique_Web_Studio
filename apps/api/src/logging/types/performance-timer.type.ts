// The opaque handle PerformanceLogger.startTimer() returns and
// endTimer() consumes — a plain data value, no behavior, nothing to
// leak or clean up on its own. `start` is a process.hrtime.bigint()
// snapshot, not a wall-clock timestamp — monotonic, immune to system
// clock adjustments mid-measurement, same rationale as
// HttpLoggingMiddleware's duration measurement.
export interface PerformanceTimer {
  readonly operation: string;
  readonly start: bigint;
  readonly category?: string;
}
