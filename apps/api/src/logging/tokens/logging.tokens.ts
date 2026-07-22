// Injection tokens — the two swap points matching interfaces/logger.interface.ts
// and interfaces/audit-logger.interface.ts. A future concrete implementation
// binds to these tokens (`{ provide: LOGGER, useClass: PinoLogger }`); every
// consumer injects the token and depends on the `Logger`/`AuditLogger`
// interface only, never a concrete class — this is what makes swapping
// implementations later a non-breaking change (Open/Closed Principle).
// Symbols, not strings, to guarantee uniqueness and avoid collisions with
// any other token in the app.
export const LOGGER = Symbol('LOGGER');
export const AUDIT_LOGGER = Symbol('AUDIT_LOGGER');

// Internal wiring tokens (Phase 1.2C.3) — the swap points matching
// interfaces/log-formatter.interface.ts and interfaces/log-transport.
// interface.ts. Only LoggingModule and its own providers (logger.service.ts,
// transports/console-log-transport.ts) ever inject these; external
// consumers depend on LOGGER/Logger only, so these two are not re-exported
// from logging/index.ts. Rebinding either here — a PrettyLogFormatter, a
// FileLogTransport — never requires touching LoggerService or any consumer.
export const LOG_FORMATTER = Symbol('LOG_FORMATTER');
export const LOG_TRANSPORT = Symbol('LOG_TRANSPORT');
