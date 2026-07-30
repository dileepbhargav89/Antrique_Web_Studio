# Logging (Phase 1.2C.9 — Module Integration & Developer Experience; extended Phase 10, Module 5 — Observability)

**Changed by Phase 10, Module 5.** `tenantId`/`userId` now actually flow
into every log line (previously declared on `LogContext` but never
populated — see "Future extension points" below), `JsonLogFormatter`
redacts sensitive-looking keys, and `main.ts`'s shutdown/final-listening
log lines now go through this module's own structured `LOGGER` instead of
`@nestjs/common`'s built-in one. See "Future extension points" for the
full account, `docs/architecture/security.md` §18, and
`docs/implementation/decisions.md`'s 2026-07-30 Module 5 entry.

This doc is architecture and design rationale — every genuine judgment
call across Phases 1.2C.1–1.2C.9. For usage examples, best-practice
guidance, and how to actually inject and call any of this from a future
business module, see `docs/architecture/logging-guide.md` instead — same
split this project already made for the config subsystem
(`configuration.md` vs. `configuration-guide.md`).

**Not to be confused with `apps/api/src/config/logging/`** — that folder
holds one validated config *value* (`format: LogFormat`, from
`LOG_FORMAT`). *This* folder holds the logging *subsystem*: the contracts
a future concrete implementation satisfies, and the module that will host
it. Same naming pattern already used for `config/database/` (connection
config) vs. `apps/api/src/database/` (future `PrismaModule` home) and
`config/health/` vs. `apps/api/src/health/` — two related, deliberately
separate folders per domain, not a duplicate.

**Status:** a real `Logger` is bound to `LOGGER` and produces JSON log
output on the console, now automatically enriched with request-scoped
context when one is active. `LoggerService` (implements `Logger`) reads
`loggerOptions.level` for level filtering, merges whatever
`RequestContextService.getContext()` currently returns into
`LogEntry.context`, and writes through `ConsoleLogTransport`, which
formats each entry via `JsonLogFormatter` — formatter/transport both
swappable via their own DI tokens (`LOG_FORMATTER`/`LOG_TRANSPORT`)
without touching `LoggerService` or any consumer of `LOGGER`. Every real
HTTP request now flows through `common/middleware/http-logging.middleware.ts`
(Phase 1.2C.5, outside this folder) — the first real caller of
`RequestContextService.run()` — so real requests carry `requestId`/
`correlationId`/`ip`/`userAgent` in `context` and get one structured
`"HTTP request completed"` log with `method`/`path`/`statusCode`/
`durationMs` in `metadata`. Direct `Logger` calls made with no active
request context (e.g. outside any HTTP request) still produce the exact
same output as Phase 1.2C.3 (no `context` key) — the behavior is additive,
not a replacement. Every unhandled exception now also produces one
`"Unhandled exception"` log via `common/filters/exception-logging.filter.ts`
(Phase 1.2C.6, outside this folder) — the same `LOGGER`, the same
automatic context merge, zero new wiring in this folder. `PerformanceLogger`
(Phase 1.2C.7) adds `startTimer`/`endTimer`/`measure`/`measureAsync` for
timing arbitrary operations — a reusable, DI-injectable utility with no
current call site (no controller/repository instrumentation, no
decorators/interceptors — all explicitly out of scope), same as every
logging capability before its first real consumer arrived. `AuditLoggerService`
(Phase 1.2C.8) is now bound to `AUDIT_LOGGER` — foundation only, no
business module calls `.log()` yet, same "capability before consumer"
pattern. Still no third-party logging library, no multiple transports,
no pretty formatter (`loggerOptions.format === 'pretty'` has no consumer
yet — see "Future extension points").

## Architecture overview

```
apps/api/src/logging/
  index.ts              Central barrel — the one import path future
                         consumers use (matches config/index.ts's pattern).
                         Exports LOGGER/Logger only — LoggerService,
                         JsonLogFormatter, ConsoleLogTransport are internal.
  logging.module.ts      @Global() NestJS module. Binds LOGGER ->
                         LoggerService, plus the two internal
                         LOG_FORMATTER/LOG_TRANSPORT wiring tokens — see
                         "Module responsibilities" below.
  logger.service.ts       LoggerService implements Logger — the concrete
                         class bound to LOGGER. Level-filters via
                         loggerOptions.level, merges the active
                         RequestContext (if any) into LogEntry.context,
                         builds LogEntry, delegates to the injected
                         LogTransport.
  request-context.service.ts  RequestContextService — AsyncLocalStorage<
                         RequestContext> wrapper. run()/getContext(), no DI
                         token (plain provider, no interface to swap
                         behind). Exported from the public barrel — a
                         future middleware outside this folder needs it.
  performance-logger.service.ts  PerformanceLogger — startTimer/endTimer
                         (manual, unguarded) + measure/measureAsync
                         (exception-safe wrappers with guaranteed cleanup-
                         on-failure logging). No DI token, exported from
                         the public barrel — same treatment as
                         RequestContextService. Never touches
                         RequestContextService itself; inherits whatever
                         context is active purely via LoggerService's
                         existing auto-merge.
  audit-logger.service.ts  AuditLoggerService implements AuditLogger — the
                         concrete class bound to AUDIT_LOGGER. Internal,
                         NOT exported from the public barrel (unlike
                         RequestContextService/PerformanceLogger) — a
                         genuine swap-point token, same category as
                         LOGGER. Never touches RequestContextService
                         either; same auto-merge reliance.
  config/                 Logging-owned config, following config/'s own
                         registerAs()/ConfigType conventions:
    logger-options.config.ts  registerAs('loggerOptions', ...) — assembles
                               LoggerOptions from already-validated
                               LOG_LEVEL/LOG_FORMAT. See file header for
                               why this lives here, not in
                               apps/api/src/config/ (frozen).
  formatters/              LogFormatter implementations:
    json-log-formatter.ts     JsonLogFormatter — the only formatter built
                               so far; matches loggerOptions.format's
                               'json' value. No 'pretty' formatter yet.
  transports/              LogTransport implementations:
    console-log-transport.ts  ConsoleLogTransport — writes via console.*,
                               routed by severity. Not environment-gated
                               (see README "Design philosophy").
  constants/
    log-level-severity.constant.ts  LOG_LEVEL_SEVERITY — ascending
                               severity ranks (fatal=0..trace=5), mirroring
                               env.validation.ts's LOG_LEVEL enum order.
  interfaces/             Behavioral contracts (things a future concrete
                         class implements and DI swaps):
    logger.interface.ts       Logger — fatal/error/warn/info/debug/trace.
    log-transport.interface.ts LogTransport — write(entry): void.
    log-formatter.interface.ts LogFormatter — format(entry): string.
    audit-logger.interface.ts  AuditLogger — log(event): void (renamed
                               from record() — see "Design philosophy").
  types/                  Plain data shapes (no behavior, nothing to swap):
    log-level.type.ts          LogLevel — mirrors config's validated LOG_LEVEL.
    log-format.type.ts         LogFormat — mirrors config's validated LOG_FORMAT.
    environment-mode.type.ts   EnvironmentMode — mirrors config's validated NODE_ENV.
    log-entry.type.ts          LogEntry — level, message, timestamp, context?, metadata?.
    log-context.type.ts        LogContext — correlationId?, requestId?, tenantId?,
                               userId?, traceId?, sessionId?, ip?, userAgent? (extended
                               Phase 1.2C.4 to match RequestContext).
    request-context.type.ts    RequestContext — requestId/correlationId required,
                               traceId?/tenantId?/userId?/sessionId?/ip?/userAgent?
                               optional (tenantId added Phase 10, Module 5).
                               Structurally assignable to LogContext directly.
    log-metadata.type.ts       LogMetadata — Record<string, unknown> alias.
    audit-event.type.ts        AuditEvent — event, action, resource,
                               resourceId?, actorType?, actorId?, outcome,
                               metadata?. All readonly. Redesigned Phase
                               1.2C.8 — see "Design philosophy".
    audit-outcome.type.ts      AuditOutcome — 'SUCCESS' | 'FAILURE'.
    logger-options.type.ts     LoggerOptions — { level, format }.
    performance-timer.type.ts  PerformanceTimer — { operation, start: bigint,
                               category? }. Opaque handle, no behavior.
  tokens/
    logging.tokens.ts          LOGGER, AUDIT_LOGGER (consumer-facing, both
                               bound to a concrete class) plus
                               LOG_FORMATTER, LOG_TRANSPORT (internal
                               wiring only) — Symbol-based DI tokens.
```

## Design philosophy

**Interfaces vs. types, split by role, not by file count.** `interfaces/`
holds contracts with methods — the things a future concrete implementation
satisfies and DI swaps (`Logger`, `LogTransport`, `LogFormatter`,
`AuditLogger`). `types/` holds plain data shapes with no behavior
(`LogEntry`, `LogContext`, `LogMetadata`, `AuditEvent`, `LoggerOptions`,
plus the three shared literal-union types below). Consumers depend on
`interfaces/`, never on a concrete class — Dependency Inversion by
construction, not by convention alone.

**Reuse Phase 1.2B's env vocabulary, don't reinvent it.**
`LogLevel`/`LogFormat`/`EnvironmentMode` are exact mirrors of
`apps/api/src/config/env.validation.ts`'s already-validated `LOG_LEVEL`/
`LOG_FORMAT`/`NODE_ENV` enums. A second, slightly-different "log level"
vocabulary in the same app would be a real, avoidable inconsistency — if
config's enum ever changes, these types change to match it, not the
other way around.

**`ConsoleLogTransport` is not environment-gated.** It writes on every
environment, not just development, despite being the "start simple"
transport. Gating it to development only would mean production silently
drops every log line with no replacement configured — a worse failure
mode than an admittedly interim transport logging everywhere. A
production-grade transport (file/cloud) is later, unscoped work: a rebind
in `logging.module.ts`, not a branch inside this one.

**`RequestContextService` has no DI token, unlike `LOGGER`/`LOG_FORMATTER`/
`LOG_TRANSPORT`.** Those three abstract over genuinely swappable
implementations (interfaces with real or anticipated alternates);
`RequestContextService` is a single concrete class wrapping Node's
`AsyncLocalStorage`, with no interface to swap it behind and no
anticipated second implementation — injected by class reference, the
ordinary NestJS pattern for a plain provider. A token+interface pair here
would be unjustified abstraction.

**No `.clear()`/`.exit()` method on `RequestContextService`.**
`AsyncLocalStorage`'s own scoping already gives "created, retrieved,
cleared": `getContext()` is `undefined` both before any `run()` and after
`run()`'s callback (and everything it transitively started) completes.
That's the natural resting state, not a separate operation to build with
no demonstrated caller.

**`PerformanceLogger` never touches `RequestContextService`.** "Inherit
`RequestContext` whenever one exists" is satisfied by doing nothing
special — it calls `logger.info()`, and whatever context is already
active reaches the log via `LoggerService`'s existing merge, exactly
like `ExceptionLoggingFilter`. This is also what makes it work
independently of HTTP middleware (nothing here assumes a request exists)
and gives "zero context leakage" for free — there's no shared
context-related state in the class at all, only a `Logger` reference.

**`startTimer`/`endTimer` are manual and unguarded; `measure`/
`measureAsync` are the exception-safe wrappers.** A `PerformanceTimer` is
a plain data value with nothing to leak or clean up on its own — manual
pairing means manual responsibility for calling `endTimer` in a `finally`
if the caller needs that guarantee. `measure()`/`measureAsync()` provide
that guarantee automatically via their own internal try/catch/finally,
always logging exactly once and always rethrowing the original error —
never swallowing it.

**`measure()` rejects an async function at compile time, not runtime.**
`fn`'s return type is constrained with `T extends Promise<unknown> ?
never : T` — passing an async function to the *sync* `measure()` (instead
of `measureAsync()`) would otherwise silently produce a misleading log:
`durationMs` truncated to the synchronous portion only, `success: true`
logged regardless of a later rejection, and that rejection never logged
or rethrown by this class at all (it becomes an unhandled promise
rejection once `measure()` already returned). A compile-time constraint
closes this with zero runtime cost, unlike a `typeof`/thenable check.

**`AuditLogger` is a distinct, narrower contract from `Logger`**, not a
`Logger` method. Audit trail entries have different durability/access
requirements than debug/info output (see Phase 1's immutable, append-only
`AuditLog` Prisma model — `docs/architecture/database-schema.md`), and
CLAUDE.md mandates audit logging as a first-class requirement, not an
afterthought bolted onto general logging.

**`AuditEvent` was redesigned in Phase 1.2C.8, not patched onto Phase
1.2C.1's speculative version.** The original (`actorUserId?`,
`resourceType`, `before?`/`after?`, `ipAddress?`/`userAgent?`) was an
architecture-only guess at mirroring the `AuditLog` Prisma model's
columns, written before this phase's real requirements existed — and this
phase explicitly excludes database persistence, so targeting a DB model's
shape no longer made sense. `ipAddress?`/`userAgent?` are gone entirely
(duplicating what `RequestContext`'s auto-merge already supplies);
`before?`/`after?` are gone (business-logic diffing, out of scope, fits
in `metadata` if a future caller wants it); `actorUserId?` became the more
generic `actorType?`/`actorId?` (an actor might be a user, a service
account, or the system itself — this phase excludes user lookup/JWT
parsing that would justify assuming a User entity specifically); `event`
(a semantic event-type identifier, e.g. `'user.password_changed'`) and
`outcome: 'SUCCESS' | 'FAILURE'` are new, required concepts this phase
introduces.

**`AuditLogger.record()` renamed to `log()`.** `record` was Phase 1.2C.1's
own placeholder guess from an architecture-only phase with no real
consumer to validate it against; this phase's own brief asks for `log()`
explicitly, and is the first real implementation.

**No `AuditLogger.logAsync()`.** Every method on `Logger` itself is
synchronous/void-returning, and this phase excludes database
persistence — there's no actual asynchronous work anywhere in the audit-
logging path to justify a second method with no behavioral difference
from `log()`.

**`AuditLoggerService` never touches `RequestContextService`, same
reasoning as `PerformanceLogger`/`ExceptionLoggingFilter`.** `logger.info()`
already auto-merges whatever context is active; a direct dependency here
would be redundant machinery for a guarantee the existing merge already
provides.

**`event.metadata` nests as its own key, not flat-merged** — unlike
`PerformanceLogger`'s caller-supplied "additional metadata" (genuinely
arbitrary extra fields merged flat), `metadata` here is one named field
*of the `AuditEvent` schema itself* ("consistent event schema" — every
audit event has exactly these 8 possible fields, one of which happens to
hold nested caller detail), so it stays nested — analogous to how
`LogEntry.metadata` itself nests rather than splicing into `LogEntry`'s
other fields.

**Folders intentionally still not created:** `decorators/`, `utils/`.
Nothing non-speculative belongs in either yet — a real decorator (e.g. a
future `@AuditLog()`) needs metadata an interceptor reads, and
interceptors are explicitly out of scope this phase; a genuine utility
function would have no current caller. `constants/` graduated this phase
(`log-level-severity.constant.ts` — real, non-speculative data `logger.
service.ts` actually needs), per "Future roadmap" below.

## Module responsibilities

`LoggingModule` is `@Global()`, imported into `AppModule`. It currently:
- Imports `ConfigModule.forFeature(loggerOptionsConfig)` — registers the
  `loggerOptions` namespace (`{ level, format }`) without touching the
  frozen `apps/api/src/config/config.module.ts`'s `forRoot()` call.
- **Provides six bindings:** `LOG_FORMATTER -> JsonLogFormatter`,
  `LOG_TRANSPORT -> ConsoleLogTransport`, `LOGGER -> LoggerService`,
  `AUDIT_LOGGER -> AuditLoggerService`, plus `RequestContextService` and
  `PerformanceLogger` (both no token, plain providers). `LOGGER`,
  `AUDIT_LOGGER`, `RequestContextService`, and `PerformanceLogger` are all
  exported; `LOG_FORMATTER`/`LOG_TRANSPORT` are internal wiring, injected
  only by `ConsoleLogTransport` (the formatter) and `LoggerService` (the
  transport) themselves, never by anything outside this module.
- `AuditLoggerService` is also internal — never exported directly (same
  treatment as `LoggerService`); consumers inject the `AUDIT_LOGGER` token
  and depend on the `AuditLogger` interface only.
- Does **not** call `RequestContextService.run()` itself — that happens
  in `common/middleware/http-logging.middleware.ts` (Phase 1.2C.5),
  outside this folder, which imports `RequestContextService` from the
  public barrel exactly as anticipated.
- `PerformanceLogger` and `AuditLoggerService` both have no current
  business-module consumer — reusable capabilities built ahead of their
  first real caller, exactly like `RequestContextService` was between
  Phase 1.2C.4 and 1.2C.5.

## Dependency boundaries

```
LoggingModule (today)
  ├─ ConfigModule.forFeature(loggerOptionsConfig)  (injects loggerOptions.level)
  providers: [
    { provide: LOG_FORMATTER, useClass: JsonLogFormatter },
    { provide: LOG_TRANSPORT, useClass: ConsoleLogTransport },   // injects LOG_FORMATTER
    { provide: LOGGER,        useClass: LoggerService },          // injects LOG_TRANSPORT + loggerOptions + RequestContextService
    { provide: AUDIT_LOGGER,  useClass: AuditLoggerService },     // injects LOGGER only, never RequestContextService
    RequestContextService,                                       // no token — plain provider
    PerformanceLogger,                                            // no token — injects LOGGER only, never RequestContextService
  ]
  exports: [LOGGER, AUDIT_LOGGER, RequestContextService, PerformanceLogger]
```

`common/middleware/http-logging.middleware.ts` (Phase 1.2C.5, outside
`apps/api/src/logging/`) imports `RequestContextService` from the public
barrel and calls `.run()` once per request; `LoggingModule` has no
dependency on that middleware or any business module — the dependency
runs one-way, middleware → Logging, never the reverse.

One-way dependency: `Logging → Config`, never the reverse. Future business
modules depend on `Logging` (inject `LOGGER`, soon `AUDIT_LOGGER`),
`Logging` never depends on business modules — matches CONTRIBUTING.md §3's
one-way dependency rule already applied to `Config`/`Database` in
`docs/architecture/backend.md` §3.

## Future extension points

Every architecture goal below is satisfiable by adding a class that
implements an existing interface and binding it to an existing token —
no interface changes required:
- **Pretty-printed logs** — `JsonLogFormatter` is the only `LogFormatter`
  built so far. A `PrettyLogFormatter` bound to `LOG_FORMATTER` instead
  (selected by `loggerOptions.format === 'pretty'`) is a rebind in
  `logging.module.ts` — zero changes to `LoggerService`,
  `ConsoleLogTransport`, or any `LOGGER` consumer.
- **Multiple transports / cloud logging** — another `LogTransport`
  implementation bound to `LOG_TRANSPORT` (or a composite transport that
  fans out to several); same zero-change guarantee for consumers.
- **Real correlation IDs / request IDs — done (Phase 1.2C.5).**
  `common/middleware/http-logging.middleware.ts` generates them (reusing
  incoming `x-request-id`/`x-correlation-id` headers when present) and
  calls `RequestContextService.run()` once per request — no
  `LoggerService`/formatter/transport change was needed to make this work,
  exactly as this section anticipated.
- **Audit logging — foundation done (Phase 1.2C.8), real call sites since
  Milestone 13.** `AuditLoggerService` implements `AuditLogger`, bound to
  `AUDIT_LOGGER`. `auth.service.ts`/`permissions.guard.ts`/`roles.guard.ts`
  call it today. Persistence to the `AuditLog` Prisma model and
  current-actor resolution beyond `email` are still separate, unscheduled
  work.
- **Security / performance / DB query / background job logging** — all
  just `Logger.info()`/`.warn()` calls with domain-specific `LogMetadata`
  shapes; no interface change needed, since `LogMetadata` is intentionally
  an open `Record<string, unknown>`.
- **`tenantId`/`userId` in every log line — done (Phase 10, Module 5).**
  `RequestContext` gained a `tenantId` field (it existed on `LogContext`
  from the start but had no matching field here, so it could never
  actually flow through) and `RequestContextService` gained
  `updateContext(patch)` — mutates the currently-running store in place,
  for a middleware/guard running LATER in the same request (not the one
  that calls `.run()`) to enrich it once it learns something new.
  `TenantMiddleware` calls it with `tenantId` once tenant resolution
  completes; `JwtAuthGuard` calls it with `userId` (the authenticated
  user's `email` — `RequestUser`/the token payload carry no database id,
  see that guard's own comment) once a token verifies. No `LoggerService`/
  formatter/transport change was needed — exactly this section's own
  "no interface change required" pattern.
- **Log masking / redaction — done (Phase 10, Module 5).**
  `JsonLogFormatter`'s existing `JSON.stringify` replacer (previously
  Error-expansion only) now also redacts any key matching a fixed,
  substring-matched sensitive-key list (`password`, `secret`, `token`,
  `authorization`, `apikey`, `privatekey`, `creditcard`, `cvv`) to
  `'[REDACTED]'`, at any nesting depth. Confirmed by this module's own
  audit that nothing currently logs a request body/header/credential —
  this closes no ACTIVE exposure, it's a guardrail against a future
  `logger.info('X', { password })` call site landing unnoticed.
- **Distributed tracing / third-party error tracking (Sentry etc.) —
  deliberately still deferred, Phase 10, Module 5.** Audited and
  confirmed absent (`SENTRY_DSN`/`OTEL_EXPORTER_OTLP_ENDPOINT` sit blank,
  unread, in `.env.example` — a placeholder, not a promise this module
  fulfills). Not built because there is no APM/tracing backend configured
  in any environment this codebase currently deploys to, and this is a
  single-service monolith — the value a trace span adds over the existing
  `requestId`/`correlationId` propagation (already real, already
  verified) is real only once either a second service exists to trace
  across, or a backend exists to receive spans. Revisit if either changes.
  Third-party error tracking is additive to (not a replacement for) the
  already-real `ExceptionLoggingFilter` full-stack-trace-plus-context
  logging — its dashboard/alerting value overlaps with Module 6
  (Monitoring)'s scope, tracked there instead of built speculatively
  against no configured DSN to verify against.

## Future roadmap

- **Phase 1.2C.2 (Logging Configuration) — done.** `loggerOptions`
  (`{ level, format }`) is now registered via
  `ConfigModule.forFeature(loggerOptionsConfig)`, assembled from the
  already-validated `LOG_LEVEL`/`LOG_FORMAT`. No new env var, no new
  validation — see `config/logger-options.config.ts`.
- **Phase 1.2C.3 (Structured Logger) — done.** `LoggerService` (implements
  `Logger`) bound to `LOGGER`, consuming `loggerOptions.level` for
  filtering; `JsonLogFormatter`/`ConsoleLogTransport` bound to their own
  `LOG_FORMATTER`/`LOG_TRANSPORT` tokens. Console-based to start, per this
  project's "named tech = default" convention — only JSON output so far,
  `loggerOptions.format === 'pretty'` has no formatter yet.
- **Phase 1.2C.4 (Request Context) — done, narrower than originally
  planned.** `RequestContextService` (`AsyncLocalStorage<RequestContext>`,
  `run()`/`getContext()`, no token) and `LoggerService`'s automatic merge
  of the active context into `LogEntry.context` both exist now. This
  phase deliberately did **not** build middleware, request ID generation,
  or correlation ID generation — verified instead by manually driving
  `RequestContextService.run()` around a `logger.*()` call, the same way
  Phase 1.2C.3 was verified before any real call site existed. Phase
  1.2C.5 is what actually generates real IDs and calls `.run()` per
  request.
- **Phase 1.2C.5 (HTTP Logging) — done.**
  `common/middleware/http-logging.middleware.ts` — the first real caller
  of `RequestContextService.run()`/`LOGGER`. A **middleware**, not an
  interceptor (this section's own earlier guess) — registered via raw
  `app.use()` in `main.ts`, not `NestModule.configure()`/
  `MiddlewareConsumer`, since `forRoutes('*')` turned out to scope
  matching to `app.setGlobalPrefix()`'s prefix (confirmed by testing: an
  unprefixed route like a future `/health` endpoint would otherwise never
  be logged). Generates `requestId`/`correlationId` (reusing incoming
  `x-request-id`/`x-correlation-id` headers when present), logs one
  `"HTTP request completed"` entry per request via `logger.info()` once
  `res` emits `'finish'` — `method`/`path`/`statusCode`/`durationMs` as
  `metadata`; `requestId`/`correlationId`/`ip`/`userAgent` reach the same
  line via the already-existing `context` auto-merge, not duplicated.
- **Phase 1.2C.6 (Exception Logging) — done.**
  `common/filters/exception-logging.filter.ts` — `ExceptionLoggingFilter
  extends BaseExceptionFilter`, registered via `{ provide: APP_FILTER,
  useClass: ExceptionLoggingFilter }` in `app.module.ts` (Nest's own
  DI-native global-filter mechanism — no `main.ts`/`app.use()` workaround
  needed here, unlike 1.2C.5's middleware, since filters aren't
  route-matched). Logs one `"HTTP request completed"`-style
  `"Unhandled exception"` entry via `LOGGER.error()` for every unhandled
  exception, then delegates to `super.catch()` so Nest's default HTTP
  response is completely unchanged. Handles `HttpException`
  (real `statusCode`), `AggregateError` (each nested error safely
  described via the same logic, recursively — never silently dropped),
  plain `Error`, and any non-Error thrown value (string, number, object,
  circular reference) — a `safeStringify()` guarantees logging itself
  never throws. `requestId`/`correlationId`/`ip`/`userAgent` reach the
  log via the same existing `context` auto-merge, untouched by this
  filter; no interface change.
- **Phase 1.2C.7 (Performance Logging) — done.** `PerformanceLogger`
  (`startTimer`/`endTimer`/`measure`/`measureAsync`) — no DI token, no
  `RequestContextService` dependency, injects only `LOGGER`. Logs
  `{ operation, durationMs, success, category? }` plus any caller-supplied
  metadata via `logger.info()` — same contract, different data, no
  interface change. `measure`/`measureAsync` always rethrow after logging
  on failure; no current call site (no controller/repository
  instrumentation, no decorators/interceptors — all explicitly out of
  scope this phase).
- **Phase 1.2C.8 (Audit Logging Foundation) — done.** `AuditLoggerService`
  (implements `AuditLogger`, renamed `record()` → `log()`) bound to
  `AUDIT_LOGGER`, injecting only `LOGGER` — never `RequestContextService`.
  `AuditEvent` redesigned (`event`, `action`, `resource`, `resourceId?`,
  `actorType?`, `actorId?`, `outcome: 'SUCCESS' | 'FAILURE'`, `metadata?`,
  all `readonly`) to match this phase's real requirements rather than
  Phase 1.2C.1's speculative DB-mirroring guess. `metadata` nests as its
  own key; `requestId`/`correlationId`/`ip`/`userAgent` reach the log via
  the existing `context` auto-merge, never duplicated. One consistent
  `.info()` level regardless of `outcome`. Foundation only — no
  persistence, no business-module call sites, no current-actor
  resolution; all separate, unscheduled work.
- **Phase 1.2C.9 (Module Integration & Developer Experience) — done.** No
  new logging capability — a whole-subsystem audit pass instead of another
  single-phase review. Found and fixed real cross-cutting documentation
  staleness no individual phase's own review would have caught:
  `docs/architecture/backend.md`'s dependency graph never showed
  `LoggingModule` at all (only `ConfigModule`), its "Deferred to Phase
  1.2B" list still falsely claimed the structured logging framework had
  "nothing consuming it yet," and its title/status summary still
  described Phase 1.2A's bare-bones state. New
  `docs/architecture/logging-guide.md` — usage examples and best-practice
  guidance, split out from this architecture-focused doc the same way
  `configuration-guide.md` was split from `configuration.md` back in
  Phase 1.2B.4. This barrel's own header comment updated to include
  `AuditLoggerService` in the internal-classes list (added Phase 1.2C.8,
  previously undocumented here).
- `decorators/`, `utils/` graduate from "not created" to real content
  whenever a future phase needs one — e.g. a `@AuditLog()` decorator once
  business modules actually call `AUDIT_LOGGER.log()` and an interceptor
  exists to read its metadata. (`constants/` already graduated in Phase
  1.2C.3 — see above.)
