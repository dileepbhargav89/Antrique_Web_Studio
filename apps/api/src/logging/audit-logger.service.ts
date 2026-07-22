import { Inject, Injectable } from '@nestjs/common';
import { AuditLogger } from './interfaces/audit-logger.interface';
import { Logger } from './interfaces/logger.interface';
import { AuditEvent } from './types/audit-event.type';
import { LOGGER } from './tokens/logging.tokens';

// The concrete AuditLogger bound to AUDIT_LOGGER (see logging.module.ts).
// Internal — never exported from the public barrel, unlike
// RequestContextService/PerformanceLogger. AUDIT_LOGGER is a genuine
// swap-point token (an interface with a real anticipated alternate
// implementation later, same category as LOGGER/LOG_FORMATTER/
// LOG_TRANSPORT) — consumers inject the token and depend on the
// AuditLogger interface, never this class directly.
//
// Reuses LOGGER internally, exactly like every other consumer in this
// subsystem — never touches RequestContextService itself.
// requestId/correlationId/ip/userAgent reach the log via LoggerService's
// existing automatic context merge (Phase 1.2C.4), never re-extracted or
// duplicated here.
//
// One consistent log level (.info()) regardless of `outcome` — matches
// the precedent already set by HttpLoggingMiddleware (status-code-
// agnostic) and PerformanceLogger (success-agnostic): a FAILURE outcome
// is still routine, expected audit information, not an application
// error — that's ExceptionLoggingFilter's job, not duplicated here.
@Injectable()
export class AuditLoggerService implements AuditLogger {
  constructor(@Inject(LOGGER) private readonly logger: Logger) {}

  log(event: AuditEvent): void {
    this.logger.info('Audit event', {
      event: event.event,
      action: event.action,
      resource: event.resource,
      outcome: event.outcome,
      ...(event.resourceId !== undefined ? { resourceId: event.resourceId } : {}),
      ...(event.actorType !== undefined ? { actorType: event.actorType } : {}),
      ...(event.actorId !== undefined ? { actorId: event.actorId } : {}),
      ...(event.metadata !== undefined ? { metadata: event.metadata } : {}),
    });
  }
}
