// Route segments, matching every prior module's "one string, one place"
// convention. Flat top-level routes, same as every other module.
export const INVOICE_ROUTE = 'invoices';
export const PAYMENT_ROUTE = 'payments';
export const TAX_RATE_ROUTE = 'tax-rates';

// Allowed `sortBy` values for each list endpoint's query DTO — an
// allowlist, not raw client input, same discipline as every other
// module's own *_SORT_FIELDS.
export const INVOICE_SORT_FIELDS = [
  'createdAt',
  'invoiceNumber',
  'totalAmount',
  'status',
  'dueDate',
] as const;
export const PAYMENT_SORT_FIELDS = ['createdAt', 'amount', 'status'] as const;
export const TAX_RATE_SORT_FIELDS = ['createdAt', 'name', 'rate'] as const;

// "Issued invoices immutable" (this milestone's own explicit rule) —
// InvoiceService.update() rejects once status is anything other than
// DRAFT. "Void invoices reject payments" — PaymentService checks this
// same set's complement before allocating.
export const INVOICE_EDITABLE_STATUSES = ['DRAFT'] as const;
export const INVOICE_VOIDABLE_STATUSES = ['DRAFT', 'SENT', 'OVERDUE'] as const;

// "Invoice numbers generated automatically" — INV-{year}-{sequence},
// zero-padded. Sequence is per-tenant-per-year (InvoiceRepository.countForTenantAndYear()),
// with a bounded retry-on-collision loop in InvoiceService (see its own
// comment) rather than a DB sequence object — proportionate for this
// milestone's own low-concurrency admin-driven invoicing flow.
export const INVOICE_NUMBER_PREFIX = 'INV';
export const INVOICE_NUMBER_GENERATION_MAX_ATTEMPTS = 5;
