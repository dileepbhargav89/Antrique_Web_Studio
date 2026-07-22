import { LogMetadata } from '../types/log-metadata.type';

// The core logging contract — one level per method, matching LogLevel's
// literal values exactly. Any future implementation (console, Pino,
// Winston, a cloud SDK) satisfies this interface; consumers depend on
// `Logger`, never on a concrete class, per the Dependency Inversion
// Principle — see tokens/logging.tokens.ts for how it's injected.
//
// No `context` parameter, unlike LogEntry's `context?: LogContext` field —
// deliberate, not an oversight. LogContext (correlationId, requestId,
// tenantId, userId) is ambient, request-scoped data a future concrete
// implementation reads from AsyncLocalStorage and attaches to every
// LogEntry it assembles internally; call sites never thread it through
// manually. `metadata` here is the opposite: per-call, explicit data the
// caller alone knows (e.g. `{ orderId }`) and must pass every time.
export interface Logger {
  fatal(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  trace(message: string, metadata?: LogMetadata): void;
}
