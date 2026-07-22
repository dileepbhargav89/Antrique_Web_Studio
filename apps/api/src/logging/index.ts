// Central barrel — the one import path future consumers use for anything
// logging-related, matching the convention apps/api/src/config/index.ts
// already established. LoggerService/JsonLogFormatter/ConsoleLogTransport/
// AuditLoggerService stay internal (consumers depend on LOGGER/Logger or
// AUDIT_LOGGER/AuditLogger only — never the concrete class); the first
// three are hidden behind LOGGER because LOG_FORMATTER/LOG_TRANSPORT are
// genuine swap points, AuditLoggerService (Phase 1.2C.8) behind
// AUDIT_LOGGER for the same reason. RequestContextService (Phase 1.2C.4)
// and PerformanceLogger (Phase 1.2C.7) ARE exported — both are plain
// classes with no interface to swap behind, meant for direct injection by
// code outside this folder. See docs/architecture/logging-guide.md for
// usage examples of everything exported here.
export { LoggingModule } from './logging.module';
export { default as loggerOptionsConfig } from './config/logger-options.config';
export { RequestContextService } from './request-context.service';
export { PerformanceLogger } from './performance-logger.service';
export * from './interfaces';
export * from './types';
export { LOGGER, AUDIT_LOGGER } from './tokens/logging.tokens';
