// Whether the audited action succeeded — a required, strongly-typed field
// on every AuditEvent (see audit-event.type.ts), not a loose boolean or
// string: a closed set of two outcomes, matching this project's pattern
// of dedicated literal-union types for enum-like fields (LogLevel,
// LogFormat, EnvironmentMode).
export type AuditOutcome = 'SUCCESS' | 'FAILURE';
