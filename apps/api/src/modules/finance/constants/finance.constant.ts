// Phase 9, Module 1 (Enterprise Operations Suite — Finance) — route
// segments, matching every prior module's "one string, one place"
// convention. Flat top-level route (same as `clients`/`suppliers`), not
// nested under `/finance/...`.
export const VENDOR_ROUTE = 'vendors';

// Allowed `sortBy` values for GET /vendors — an allowlist, not raw client
// input, same discipline as every other module's own *_SORT_FIELDS.
export const VENDOR_SORT_FIELDS = ['createdAt', 'name', 'status'] as const;

// Client-supplied, not server-derived — same pattern
// `modules/inventory/constants/inventory.constant.ts` (Supplier) and
// `modules/crm/constants/crm.constant.ts` (CustomerTag) already establish.
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_PATTERN_MESSAGE =
  'slug must be lowercase alphanumeric segments separated by single hyphens (e.g. "acme-hosting")';
