# Middleware

**`http-logging.middleware.ts` (Phase 1.2C.5)** — the first real content
here. Registered via raw `app.use()` in `main.ts`, not `app.module.ts`'s
`configure()`/`MiddlewareConsumer` — confirmed by direct testing that
`MiddlewareConsumer`-style registration scopes matching to
`app.setGlobalPrefix()`'s prefix, so requests outside it would silently
never reach it; `app.use()` at the HTTP-adapter level runs for every
request regardless of the Nest-level prefix. `HttpLoggingMiddleware` is
still listed in `app.module.ts`'s `providers` purely so `app.get()` can
resolve a real instance in `main.ts`. Per request:
generates `requestId`/`correlationId` (reusing incoming `x-request-id`/
`x-correlation-id` headers when present), establishes a
`RequestContext` via `RequestContextService.run()` (`apps/api/src/logging/`),
and logs one structured completion entry via `LOGGER` once the response's
`'finish'` event fires — `{ method, path, statusCode, durationMs }` as
metadata; `requestId`/`correlationId`/`ip`/`userAgent` reach the same log
line automatically via `LoggerService`'s existing context-merge (Phase
1.2C.4), not duplicated here. Full detail: `apps/api/src/logging/README.md`.

No request ID/correlation ID *generation logic* beyond `crypto.randomUUID()`
as a fallback, no other middleware — a future `trace_id`-propagating
interceptor or exception filter is separate, unbuilt work.
