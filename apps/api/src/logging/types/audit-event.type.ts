import { AuditOutcome } from './audit-outcome.type';
import { LogMetadata } from './log-metadata.type';

// What a caller provides to AuditLogger.log() (Phase 1.2C.8). Redesigned
// from Phase 1.2C.1's original guess (actorUserId?, resourceType,
// before?/after?, ipAddress?/userAgent?), which was an architecture-only
// attempt at mirroring the AuditLog Prisma model's columns — written
// before this phase's real requirements existed. This phase explicitly
// excludes database persistence/audit tables, so mirroring a DB model is
// no longer the right target; this field list is the authoritative shape
// now:
//   - ipAddress/userAgent dropped entirely — RequestContext's existing
//     auto-merge already supplies these as ip/userAgent (Phase 1.2C.4);
//     restating them here would be exactly the duplication this phase's
//     brief forbids.
//   - before?/after? dropped — that's business-logic diffing, out of
//     scope, and whatever a future caller wants to attach there fits in
//     `metadata` instead.
//   - actorUserId? replaced by actorType?/actorId? — more generic: an
//     actor might be a user, a service account, or the system itself,
//     and this phase explicitly excludes user lookup/JWT parsing that
//     would justify assuming a User entity specifically.
//   - resourceType renamed to resource; outcome is new and required.
// `event` and `action` are deliberately distinct: `event` is a semantic
// event-type identifier (e.g. 'user.password_changed'), `action` a
// coarser CRUD-style categorization (e.g. 'UPDATE') — orthogonal axes an
// audit trail is commonly queried by.
//
// All fields `readonly` — "immutable audit event objects" is an explicit
// requirement, same treatment as PerformanceTimer (Phase 1.2C.7).
// `readonly` is compile-time only; it holds as a real runtime guarantee
// here specifically because AuditLoggerService.log() → LoggerService →
// ConsoleLogTransport → JsonLogFormatter is a fully synchronous chain —
// every field's value (and JSON.stringify's own serialization) is
// captured before `log()` returns, so mutating a caller's original event
// object afterward can never retroactively change an already-printed
// log line (confirmed empirically, not assumed). If an asynchronous
// transport is ever added, this reasoning needs re-examination — a
// caller mutating `event.metadata` between the synchronous `log()` call
// and a deferred async flush would no longer be provably safe.
export interface AuditEvent {
  readonly event: string;
  readonly action: string;
  readonly resource: string;
  readonly resourceId?: string;
  readonly actorType?: string;
  readonly actorId?: string;
  readonly outcome: AuditOutcome;
  readonly metadata?: LogMetadata;
}
