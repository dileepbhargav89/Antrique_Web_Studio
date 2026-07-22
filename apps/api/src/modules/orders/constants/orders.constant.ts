// Route segments, matching every prior module's "one string, one place"
// convention.
export const CUSTOMER_ROUTE = 'customers';
export const ORDER_ROUTE = 'orders';

// Allowed `sortBy` values for each list endpoint's query DTO — an
// allowlist, not raw client input, same discipline as every other
// module's own *_SORT_FIELDS.
export const CUSTOMER_SORT_FIELDS = ['email', 'lastName', 'createdAt'] as const;
export const ORDER_SORT_FIELDS = ['createdAt', 'total', 'status'] as const;

// Order status transition rules — "the workflow diagram" (this
// milestone's own brief), read as realistic e-commerce semantics rather
// than a strictly literal Draft→Pending→Confirmed→Processing→Completed→
// Cancelled chain (which would imply cancelling only AFTER completion —
// see docs/implementation/decisions.md for why that reading was
// rejected). Forward progression is strictly one step at a time;
// CANCELLED is reachable from any non-terminal status; COMPLETED and
// CANCELLED are both terminal.
export const ORDER_FORWARD_TRANSITIONS: Record<string, string | null> = {
  DRAFT: 'PENDING',
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'COMPLETED',
  COMPLETED: null,
  CANCELLED: null,
};

export const ORDER_CANCELLABLE_STATUSES = ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING'] as const;
