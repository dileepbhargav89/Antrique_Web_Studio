import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import loggerOptionsConfig from './config/logger-options.config';
import { LoggerService } from './logger.service';
import { JsonLogFormatter } from './formatters/json-log-formatter';
import { ConsoleLogTransport } from './transports/console-log-transport';
import { RequestContextService } from './request-context.service';
import { PerformanceLogger } from './performance-logger.service';
import { AuditLoggerService } from './audit-logger.service';
import { LOGGER, LOG_FORMATTER, LOG_TRANSPORT, AUDIT_LOGGER } from './tokens/logging.tokens';

// Structural scaffolding, now with a real Logger bound and request-scoped
// context plumbing — Phase 1.2C.3 (Structured Logger) + 1.2C.4 (Request
// Context). @Global() so LOGGER/RequestContextService are available
// everywhere without every module re-importing this one, matching
// ConfigModule's own precedent (apps/api/src/config/config.module.ts).
//
// Imports ConfigModule.forFeature(loggerOptionsConfig) — not the frozen
// config.module.ts's forRoot() call — to register the `loggerOptions`
// namespace from within this module. See config/logger-options.config.ts
// for why this lives here instead of apps/api/src/config/.
//
// providers bind three internal DI tokens: LOG_FORMATTER -> JsonLogFormatter
// and LOG_TRANSPORT -> ConsoleLogTransport are wiring-only (never exported —
// only LoggerService and ConsoleLogTransport themselves ever inject them);
// LOGGER -> LoggerService is the one consumer-facing binding. Swapping the
// formatter/transport later (a PrettyLogFormatter, a FileLogTransport)
// means rebinding here, never touching LoggerService or any consumer of
// LOGGER.
//
// RequestContextService and PerformanceLogger (Phase 1.2C.7) both have no
// token — plain providers, no interface to swap either behind — and are
// both exported, unlike LoggerService/JsonLogFormatter/ConsoleLogTransport:
// RequestContextService is consumed by common/middleware/
// http-logging.middleware.ts to call .run() once per request;
// PerformanceLogger is meant for direct injection by arbitrary future
// application code timing an operation — no current call site yet, same
// as every logging capability before its first real consumer arrived.
//
// AUDIT_LOGGER -> AuditLoggerService (Phase 1.2C.8) — a genuine swap-point
// token, same category as LOGGER/LOG_FORMATTER/LOG_TRANSPORT:
// AuditLoggerService stays internal (never exported), consumers inject
// the AUDIT_LOGGER token and depend on the AuditLogger interface, never
// the concrete class. Foundation only — no business module calls it yet.
@Global()
@Module({
  imports: [ConfigModule.forFeature(loggerOptionsConfig)],
  providers: [
    { provide: LOG_FORMATTER, useClass: JsonLogFormatter },
    { provide: LOG_TRANSPORT, useClass: ConsoleLogTransport },
    { provide: LOGGER, useClass: LoggerService },
    { provide: AUDIT_LOGGER, useClass: AuditLoggerService },
    RequestContextService,
    PerformanceLogger,
  ],
  exports: [LOGGER, AUDIT_LOGGER, RequestContextService, PerformanceLogger],
})
export class LoggingModule {}
