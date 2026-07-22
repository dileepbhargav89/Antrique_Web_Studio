// Request/operation-scoped identity data a log entry can be tagged with —
// "who, which request." All fields stay optional: Phase 1.2C.4 builds the
// AsyncLocalStorage plumbing (RequestContextService, see
// request-context.service.ts) that CAN populate correlationId/requestId/
// traceId/sessionId/ip/userAgent, but nothing calls it yet — that's a
// future middleware's job (explicitly out of scope this phase too).
// tenantId/userId still need auth, later still. traceId/sessionId/ip/
// userAgent mirror RequestContext (types/request-context.type.ts) exactly,
// which is why a RequestContext value is directly assignable here with no
// mapping function — see that file's header for the full reasoning.
export interface LogContext {
  correlationId?: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  traceId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}
