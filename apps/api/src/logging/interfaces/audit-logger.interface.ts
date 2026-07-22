import { AuditEvent } from '../types/audit-event.type';

// A distinct, narrower contract from `Logger` — compliance/security audit
// trail. CLAUDE.md mandates audit logging for every feature; this is the
// logging-layer contract a concrete implementation (Phase 1.2C.8's
// AuditLoggerService) emits AuditEvents through, kept separate from
// general application `Logger` output on purpose (an audit trail has
// different durability/access requirements than debug/info logs).
//
// `log()`, not `record()` (Phase 1.2C.1's original placeholder name) —
// that phase was architecture-only with no real consumer to validate the
// name against; this phase's own brief asks for `log()` explicitly, and
// is the first real implementation.
//
// No `logAsync()`: every method here and on `Logger` itself is
// synchronous/void-returning, and this phase excludes database
// persistence — there's no actual asynchronous work anywhere in the
// audit-logging path to justify a second method with no behavioral
// difference from this one.
export interface AuditLogger {
  log(event: AuditEvent): void;
}
