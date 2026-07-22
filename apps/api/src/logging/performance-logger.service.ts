import { Inject, Injectable } from '@nestjs/common';
import { Logger } from './interfaces/logger.interface';
import { LogMetadata } from './types/log-metadata.type';
import { PerformanceTimer } from './types/performance-timer.type';
import { LOGGER } from './tokens/logging.tokens';

interface StartTimerOptions {
  category?: string;
}

interface EndTimerOptions {
  success?: boolean;
  metadata?: LogMetadata;
}

interface MeasureOptions {
  category?: string;
  metadata?: LogMetadata;
}

// A reusable, DI-injectable timing utility — no DI token, exported by
// class reference (same treatment as RequestContextService, not
// LoggerService/LOGGER): a single concrete class with no interface to
// swap it behind, meant for direct injection by arbitrary future
// application code, not an internal implementation detail.
//
// Never touches RequestContextService. "Automatically inherit
// RequestContext whenever one exists" is satisfied by doing nothing
// special — logger.info() already auto-merges whatever context is
// active (Phase 1.2C.4), exactly like ExceptionLoggingFilter. This is
// also what makes "work independently of HTTP middleware" true (nothing
// here assumes an HTTP request exists) and "zero context leakage" hold
// by construction (no shared mutable context-related state at all).
//
// startTimer()/endTimer() are manual and un-guarded — a plain data
// handle with nothing to clean up on its own; the caller is responsible
// for calling endTimer() in a finally if they need that guarantee.
// measure()/measureAsync() are the exception-safe wrappers that actually
// provide "timer cleanup on failure": their own try/catch/finally always
// logs exactly once, then rethrows — this class never swallows an
// exception from the wrapped operation.
@Injectable()
export class PerformanceLogger {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  startTimer(operation: string, options?: StartTimerOptions): PerformanceTimer {
    return {
      operation,
      start: process.hrtime.bigint(),
      category: options?.category,
    };
  }

  endTimer(timer: PerformanceTimer, options?: EndTimerOptions): number {
    const durationMs = Number(process.hrtime.bigint() - timer.start) / 1e6;

    // Caller-supplied metadata spreads BEFORE the fixed fields, so a
    // same-named key in it can never clobber operation/durationMs/
    // success/category.
    this.logger.info('Performance measurement', {
      ...(options?.metadata ?? {}),
      operation: timer.operation,
      durationMs,
      success: options?.success ?? true,
      ...(timer.category !== undefined ? { category: timer.category } : {}),
    });

    return durationMs;
  }

  // The `T extends Promise<unknown> ? never : T` constraint on `fn`'s
  // return type rejects an async function at compile time, not runtime —
  // passing one here would otherwise silently produce a misleading log
  // (durationMs truncated to the synchronous portion only, success:
  // true logged regardless of a later rejection, and that rejection
  // never logged or awaited by anything, becoming an unhandled promise
  // rejection). Zero runtime cost, unlike a typeof/thenable check.
  measure<T>(
    operation: string,
    fn: () => T extends Promise<unknown> ? never : T,
    options?: MeasureOptions,
  ): T {
    const timer = this.startTimer(operation, options);
    let success = true;
    try {
      return fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      this.endTimer(timer, { success, metadata: options?.metadata });
    }
  }

  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: MeasureOptions,
  ): Promise<T> {
    const timer = this.startTimer(operation, options);
    let success = true;
    try {
      return await fn();
    } catch (error) {
      success = false;
      throw error;
    } finally {
      this.endTimer(timer, { success, metadata: options?.metadata });
    }
  }
}
