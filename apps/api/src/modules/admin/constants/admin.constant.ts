// Route segments, matching every prior module's "one string, one place"
// convention. Flat top-level routes, same as every other module.
export const NOTIFICATION_ROUTE = 'notifications';
export const AUDIT_LOG_ROUTE = 'audit-logs';
export const DASHBOARD_ROUTE = 'dashboard';
export const REPORT_ROUTE = 'reports';
export const RUNTIME_ROUTE = 'runtime';

// Allowed `sortBy` values for each list endpoint's query DTO — an
// allowlist, not raw client input, same discipline as every other
// module's own *_SORT_FIELDS.
export const NOTIFICATION_SORT_FIELDS = ['createdAt', 'status'] as const;
export const AUDIT_LOG_SORT_FIELDS = ['createdAt', 'action', 'resourceType'] as const;
export const REPORT_SORT_FIELDS = ['createdAt', 'type'] as const;

// "Notification status lifecycle" (this milestone's own explicit
// business rule): PENDING -> QUEUED -> SENT, or -> FAILED from either
// non-terminal state. "Failed notifications are retryable" — retry()
// only accepts this one starting status.
export const NOTIFICATION_RETRYABLE_STATUSES = ['FAILED'] as const;

// Modules the Dashboard/Reporting surface aggregates over — this
// milestone's own explicit list ("Aggregate data from existing modules:
// Orders, Inventory, Billing, CRM, Catalog").
export const DASHBOARD_KPI_MODULES = ['orders', 'inventory', 'billing', 'crm', 'catalog'] as const;
