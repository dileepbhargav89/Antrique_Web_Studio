// The shape RequestContextService's AsyncLocalStorage store holds —
// distinct from LogContext (what a LogEntry can carry), since this is the
// request-scoped store itself, not the log-entry projection of it.
// requestId/correlationId are required (a future middleware always sets
// both when it establishes a context — generating their values is
// explicitly not this phase's job); everything else is optional, per this
// phase's brief. Deliberately structurally assignable to LogContext with
// no mapping function: every field here exists on LogContext with the
// same or a looser (optional) type, so `context: requestContext` type-checks
// directly in logger.service.ts. If either type changes independently,
// that assignment stops compiling — a real, not just documented, guarantee
// they stay compatible.
export interface RequestContext {
  requestId: string;
  correlationId: string;
  traceId?: string;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
}
