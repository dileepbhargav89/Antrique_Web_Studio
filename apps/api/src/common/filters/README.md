# Exception filters

**`exception-logging.filter.ts` (Phase 1.2C.6)** — the first real content
here. `ExceptionLoggingFilter extends BaseExceptionFilter`, registered
globally via `{ provide: APP_FILTER, useClass: ExceptionLoggingFilter }`
in `app.module.ts`. Logs every unhandled exception via `LOGGER` (message,
exception type, status code when available, stack trace when available,
request method/path — `requestId`/`correlationId`/`ip`/`userAgent` reach
the same log line automatically via `LoggerService`'s existing context
merge, not duplicated here), then calls `super.catch(exception, host)` so
the HTTP response sent to the client is Nest's completely unchanged
default. Handles `HttpException`, `AggregateError` (each nested error
safely described, not silently dropped), plain `Error`, and any non-Error
thrown value (string, number, plain object, circular reference) — never
throws during logging itself.

**Not** the RFC 9457 error-shape filter (CONTRIBUTING.md §14) — that
reshapes the HTTP response body into Problem Details format, which this
filter deliberately does not do (it preserves Nest's default response
shape). That filter remains separate, unscheduled work; see `main.ts`'s
bootstrap comment.
