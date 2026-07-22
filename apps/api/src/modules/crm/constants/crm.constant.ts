// Route segments, matching every prior module's "one string, one place"
// convention. Flat top-level routes (same as `orders`/`customers` in
// Milestone 8), not nested under `/crm/...` — `customerId`/`leadId` are
// query/body fields, not path segments, matching this codebase's
// established convention (no module nests its routes under its own name).
export const LEAD_ROUTE = 'leads';
export const CUSTOMER_NOTE_ROUTE = 'customer-notes';
export const CUSTOMER_ACTIVITY_ROUTE = 'customer-activities';
export const FOLLOW_UP_ROUTE = 'follow-ups';
export const CUSTOMER_TAG_ROUTE = 'customer-tags';

// Allowed `sortBy` values for each list endpoint's query DTO — an
// allowlist, not raw client input, same discipline as every other
// module's own *_SORT_FIELDS.
export const LEAD_SORT_FIELDS = ['createdAt', 'contactName', 'status'] as const;
export const CUSTOMER_NOTE_SORT_FIELDS = ['createdAt'] as const;
export const CUSTOMER_ACTIVITY_SORT_FIELDS = ['createdAt'] as const;
export const FOLLOW_UP_SORT_FIELDS = ['createdAt', 'dueAt', 'status'] as const;
export const CUSTOMER_TAG_SORT_FIELDS = ['createdAt', 'name'] as const;

// Lead statuses "Archived leads immutable"/conversion both treat as
// terminal — no further mutation via update()/convert()/archive() once
// reached. Distinct from ORDER_CANCELLABLE_STATUSES's own shape
// (Milestone 8) in that there's no forward-transition chain to encode
// here — LeadService.update() just rejects when the CURRENT status is
// one of these two, it doesn't validate a specific next status.
export const LEAD_TERMINAL_STATUSES = ['CONVERTED', 'ARCHIVED'] as const;

// "Prevent duplicate active leads" (this milestone's own explicit
// business rule) — any lead in a non-terminal status counts as "active"
// for duplicate-detection purposes. Service-level check only, not a DB
// CHECK/partial-unique-index backstop — see
// docs/implementation/decisions.md for why this is proportionate here
// (the same class of judgment call Milestone 8 made for "default
// addresses": a race producing a second active lead for the same email
// is a minor sales-ops annoyance, not a financial-correctness issue).
export const LEAD_ACTIVE_STATUSES = ['NEW', 'QUALIFIED', 'QUOTED'] as const;

// Same pattern `modules/catalog/constants/catalog.constant.ts` already
// established — client-supplied, not server-derived, for `CustomerTag`'s
// own slug (this module's one entity that needs one).
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_PATTERN_MESSAGE =
  'slug must be lowercase alphanumeric segments separated by single hyphens (e.g. "at-risk")';
