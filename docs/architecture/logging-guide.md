# Logging Developer Guide (Phase 1.2C.9)

Practical companion to `apps/api/src/logging/README.md` (architecture,
DI design, every genuine judgment call across Phases 1.2C.1–1.2C.8). This
doc doesn't re-explain any of that — it's usage examples and best-practice
guidance for a developer who needs to *use* the logging subsystem today,
mirroring the same split `configuration-guide.md` already made for the
config subsystem ("usage examples... are a different kind of content from
architecture/rationale focus").

## 1. Orientation (30 seconds)

- **`LOGGER`** (token) / `Logger` (interface) — `fatal`/`error`/`warn`/
  `info`/`debug`/`trace`, each `(message: string, metadata?: LogMetadata)`.
  The one thing every other capability below is built on top of.
- **`AUDIT_LOGGER`** (token) / `AuditLogger` (interface) — one method,
  `log(event: AuditEvent)`, for security/business-critical events. No
  business module calls this yet (Phase 1.2C.8 is foundation only).
- **`PerformanceLogger`** (exported class, no token) — `measure()`/
  `measureAsync()` (exception-safe, log exactly once, always rethrow) and
  `startTimer()`/`endTimer()` (manual pair). No current call site yet.
- **`RequestContextService`** (exported class, no token) — you almost
  never call this directly. It exists so a future middleware/job-runner
  can establish a request-scoped context; every `Logger`/`AuditLogger`
  call automatically picks up whatever context is active, with zero
  effort from the caller.
- **Two real consumers exist today**: `common/middleware/
  http-logging.middleware.ts` (one `"HTTP request completed"` log per
  request) and `common/filters/exception-logging.filter.ts` (one
  `"Unhandled exception"` log per uncaught exception). Both are the model
  to copy for "how does a real caller use `LOGGER`."

## 2. Usage examples

### 2.1 Injecting `LOGGER` into a provider
```ts
import { Inject, Injectable } from '@nestjs/common';
import { LOGGER, Logger } from '../../logging'; // path from apps/api/src/modules/<x>/

@Injectable()
export class WidgetService {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  create(name: string): void {
    // ...
    this.logger.info('Widget created', { name });
    // requestId/correlationId/ip/userAgent are NOT passed here — they
    // arrive automatically via the active RequestContext, if any (§3).
  }
}
```
This is exactly the pattern `HttpLoggingMiddleware`/`ExceptionLoggingFilter`
already use — copy it, don't invent a variant.

### 2.2 Recording an audit event
```ts
import { Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOGGER, AuditLogger } from '../../logging';

@Injectable()
export class UserService {
  constructor(@Inject(AUDIT_LOGGER) private readonly auditLogger: AuditLogger) {}

  changePassword(userId: string): void {
    // ...
    this.auditLogger.log({
      event: 'user.password_changed',
      action: 'UPDATE',
      resource: 'user',
      resourceId: userId,
      actorType: 'user',
      actorId: userId,
      outcome: 'SUCCESS',
    });
  }
}
```
`event` is the semantic identifier ("what kind of thing happened" —
query by this); `action` is the coarser CRUD categorization ("what
operation" — query by this instead when `event` is too specific). Both
are useful; neither replaces the other.

### 2.3 Timing an operation
```ts
import { Inject, Injectable } from '@nestjs/common';
import { PerformanceLogger } from '../../logging';

@Injectable()
export class ReportService {
  constructor(private readonly perf: PerformanceLogger) {} // no token — plain class

  async generate(): Promise<Report> {
    return this.perf.measureAsync('report.generate', async () => {
      return this.buildReport(); // however long this takes, logged automatically
    });
  }

  private buildReport(): Promise<Report> { /* ... */ }
}
```
Use `measure()`/`measureAsync()` by default — they guarantee exactly-once
logging and always rethrow the original error. Reach for manual
`startTimer()`/`endTimer()` only when the operation being timed doesn't
fit a single callback (e.g. straddling two unrelated code paths); if you
do, call `endTimer()` in a `finally` yourself — the manual pair has no
built-in cleanup guarantee.

### 2.4 Confirming `RequestContext` arrives automatically
Nothing to write — this is the point. Any `LOGGER`/`AUDIT_LOGGER`/
`PerformanceLogger` call made while handling an HTTP request
automatically includes `requestId`/`correlationId`/`ip`/`userAgent` in
the log entry's `context`, because `HttpLoggingMiddleware` already
established that context for the whole request. Never re-read these
fields yourself and pass them as `metadata` — that's exactly the
duplication every phase since 1.2C.4 has avoided.

## 3. Best-practice guidelines

| Situation | Do | Don't |
|---|---|---|
| Logging a routine event | `logger.info(message, metadata)` | Invent a new log level scheme |
| Logging a caught error you're handling yourself | `logger.error(message, metadata)` | Rely on `ExceptionLoggingFilter` — that only fires for *unhandled* exceptions that reach the exception zone |
| An exception you don't catch | Nothing — let it propagate | Manually re-log it before rethrowing; `ExceptionLoggingFilter` already logs every unhandled exception exactly once |
| Timing any operation | `PerformanceLogger.measure()`/`measureAsync()` | `Date.now()` diffs and a manual `logger.info()` call — you'd be re-implementing what already exists, with none of the exception-safety guarantees |
| Request identity (requestId/correlationId/ip/userAgent) | Nothing — let the `context` auto-merge supply it | Read it off the request yourself and put it in `metadata` |
| Extra event-specific detail | Put it in `metadata` | Invent new top-level fields on `LogEntry`/`AuditEvent` |
| Choosing `event` vs `action` for an audit record | Use both — `event` for "what kind," `action` for "what CRUD operation" | Use only one and try to make it do both jobs |
| An audit event whose outcome is a failure | `outcome: 'FAILURE'`, still via `.log()` | A different method, or `logger.error()` instead — `AuditLoggerService` intentionally logs both outcomes at the same level |

## 4. Extension guide — pointers, not re-derivation

Full rationale for all of these lives in `apps/api/src/logging/README.md`'s
"Future extension points" and "Future roadmap" — this section only tells
you *where* to look, not the reasoning again:

- **A new log format** (e.g. pretty-printed) — bind a new `LogFormatter`
  to `LOG_FORMATTER` in `logging.module.ts`. Zero changes to
  `LoggerService`, any transport, or any `LOGGER` consumer.
- **A new transport** (file, cloud) — bind a new `LogTransport` to
  `LOG_TRANSPORT`, same zero-change guarantee.
- **A persistence-backed `AuditLogger`** — rebind `AUDIT_LOGGER` to a new
  class; every existing `@Inject(AUDIT_LOGGER)` call site is unaffected,
  since none of them depend on `AuditLoggerService` directly.
- **A request-establishing middleware for a non-HTTP entry point** (e.g. a
  future job runner) — inject `RequestContextService` (exported, no
  token) and call `.run()` once per unit of work, exactly like
  `HttpLoggingMiddleware` does for HTTP requests.

## Deferred (explicitly out of scope for this doc)

- Any new logging capability, runtime behavior change, or business-module
  integration — this phase (1.2C.9) is documentation/DX only, per its own
  brief.
- Audit/log persistence, metrics, tracing, external monitoring — all
  separate, unscheduled work (see `logging/README.md`'s roadmap).
