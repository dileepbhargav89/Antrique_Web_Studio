// Arbitrary structured data attached to one specific log call (e.g.
// { orderId: '123', amount: 50 }) — distinct from LogContext, which is
// request-wide identity data reused across many log calls in the same
// request. A plain branded alias, not an empty interface, since it has no
// fields of its own to declare.
export type LogMetadata = Record<string, unknown>;
