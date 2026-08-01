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
// Phase 7 (Enterprise CRM/Project-Management) — Client already fully
// modeled since Phase 1.1A with zero application-layer consumers (same
// "found already modeled, first real repository" situation Lead itself
// was in before Milestone 9). Flat top-level route, same convention as
// every entity above.
export const CLIENT_ROUTE = 'clients';
// Phase 7 (Enterprise CRM/Project-Management), Phase 2 — the closest
// existing model to the brief's "Proposal" concept; no separate Proposal
// model exists (confirmed via schema-wide search) — see quotation.service.ts's
// own header comment.
export const QUOTATION_ROUTE = 'quotations';

// Allowed `sortBy` values for each list endpoint's query DTO — an
// allowlist, not raw client input, same discipline as every other
// module's own *_SORT_FIELDS.
export const LEAD_SORT_FIELDS = ['createdAt', 'contactName', 'status'] as const;
export const CUSTOMER_NOTE_SORT_FIELDS = ['createdAt'] as const;
export const CUSTOMER_ACTIVITY_SORT_FIELDS = ['createdAt'] as const;
export const FOLLOW_UP_SORT_FIELDS = ['createdAt', 'dueAt', 'status'] as const;
export const CUSTOMER_TAG_SORT_FIELDS = ['createdAt', 'name'] as const;
export const CLIENT_SORT_FIELDS = ['createdAt', 'name', 'status'] as const;
export const QUOTATION_SORT_FIELDS = [
  'createdAt',
  'quotationNumber',
  'status',
  'totalAmount',
] as const;

// "Quote-wizard output" (schema.prisma's own comment) — leadId/clientId
// both nullable, exactly one must be set (a fresh-prospect quote vs. a
// repeat-business quote), enforced at the application layer (a hand-
// written cross-column CHECK also exists at the DB level —
// `quotations_lead_xor_client_check`, Prisma's schema DSL has no
// cross-column CHECK support).
export const QUOTATION_TERMINAL_STATUSES = [
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED',
] as const;
// Only DRAFT is editable — narrower than Lead's own editable window
// (NEW/QUALIFIED/QUOTED), a deliberate call: once a quotation is SENT, a
// silent edit would misrepresent what the recipient actually saw. Same
// per-tenant-per-year sequence pattern as INVOICE_NUMBER_PREFIX
// (billing.constant.ts) — "Q" instead of "INV".
export const QUOTATION_EDITABLE_STATUSES = ['DRAFT'] as const;
export const QUOTATION_NUMBER_PREFIX = 'Q';
export const QUOTATION_NUMBER_GENERATION_MAX_ATTEMPTS = 5;

// Applied when POST /quotations omits `paymentStages` — a sensible
// 40/40/20 default (advance / milestone / final) so every quotation ships
// with a real payment schedule without the caller re-typing it every
// time, while staying fully overridable (see QuotationService.create()).
// Not used on update() — an omitted `paymentStages` there means "leave
// the existing schedule alone," same as every other optional field.
export const DEFAULT_PAYMENT_STAGES: ReadonlyArray<{
  label: string;
  triggerNote: string;
  percentage: number;
}> = [
  { label: 'Advance Payment', triggerNote: 'Due on acceptance of this proposal', percentage: 40 },
  {
    label: 'Milestone Payment',
    triggerNote: 'Due on completion of the development milestone',
    percentage: 40,
  },
  { label: 'Final Payment', triggerNote: 'Due prior to final delivery & handover', percentage: 20 },
];

// Server-side validation, not just documentation: QuotationService
// rejects any create()/update() where the given stages' percentages don't
// sum to this within tolerance — floating-point arithmetic on
// user-entered percentages (e.g. three stages of 33.33/33.33/33.34) never
// lands on exactly 100.
export const PAYMENT_STAGE_PERCENTAGE_TOTAL = 100;
export const PAYMENT_STAGE_PERCENTAGE_TOLERANCE = 0.01;

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
