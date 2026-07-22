# BillingModule (Milestone 10 — Payments & Billing Foundation)

"This module owns financial records only. It must not become a payment
gateway implementation" (this milestone's own framing). Three controller/
service/repository triads — Invoice, Payment, Tax — on top of `Invoice`/
`InvoiceItem`/`Payment` (reused wholesale, not duplicated — see below),
`TaxRate`, `PaymentMethod`, `PaymentAllocation`. Tenant-isolated, RBAC-
protected, transactional payment allocation, decimal-only monetary
arithmetic throughout.

## Architecture audit (before writing any code)

A repo-wide search for `Invoice`/`Payment`/`PaymentRecord`/`Quotation`/
`Tax`/`Currency`/`Receipt`/`Credit Note` found `Invoice`/`InvoiceItem`/
`Payment`/`Quotation`/`QuotationItem` already fully modeled since Phase
1.1A/1.1B, with **zero application-layer consumers** — no
`InvoiceRepository`/`PaymentRepository`/`InvoiceService`/`PaymentService`/
`InvoiceController`/`PaymentController` existed anywhere, the same
"schema exists, first real consumer" situation Milestones 3 and 9
already found. Notably, the existing schema had ALREADY anticipated two
of this milestone's own core business rules at the database level,
before any application code existed:
`invoices_amount_paid_check` (`amount_paid >= 0 AND amount_paid <=
total_amount`, `20260717091000_check_constraints`) already enforces
"Paid amount never exceeds invoice total"; `payments` already has
`UPDATE`/`DELETE` revoked at the database-privilege level
(`20260717091500_row_level_security`), already enforcing append-only
payment records. No `TaxRate`/`PaymentMethod`/`PaymentAllocation`
entities existed anywhere. `Invoice`/`Payment` are reused wholesale (see
each model's own updated schema.prisma comment for the additive-only
changes); this milestone adds three genuinely new tables. Full reasoning
for every non-obvious call: `docs/implementation/decisions.md`.

**`Invoice`/`Payment` are reused, not duplicated — but genuinely
extended, not left untouched.** `Invoice.clientId` (the pre-existing,
still-unconsumed agency-billing path → `Client`) changed from required
to nullable, and gained `customerId`/`orderId` (→ the NEW e-commerce
path, "Invoices belong to Orders," this milestone's own explicit
framing) plus `taxRateId`. `Payment.invoiceId`/`provider`/`providerRef`
(the pre-existing gateway-webhook-event shape) all became nullable, and
`Payment` gained `paymentMethodId`/`method`/`reference` (this
milestone's own manually-RECORDED-payment shape — "Record payment"/
"Allocate payment" are separate business responsibilities, split out
specifically so a payment can exist before it's tied to any invoice).
Both changes mirror Milestone 9's own `Lead.convertedCustomerId` vs.
`convertedClientId` precedent: two independent paths coexisting on one
shared entity, neither replacing the other.

## What's real here

- `billing.module.ts` — `BillingModule`, imported into `AppModule`. Not
  `@Global()`. **Imports TWO other modules** — `OrdersModule` (now
  `exports: [CustomerRepository, OrderRepository]`) for "Invoices belong
  to Orders"/"Use: OrderRepository, CustomerRepository," and
  `CatalogModule` (exported `ProductRepository`) to resolve a
  human-readable invoice line-item description from the originating
  order line's own product variant SKU — the SAME repository
  `OrdersModule` itself already imports for an identical reason.
  Deliberately does NOT import `CrmModule` — "CRM remains independent,"
  this milestone's own explicit instruction. One-directional; neither
  `OrdersModule` nor `CatalogModule` imports `BillingModule` — "Zero
  circular dependencies" holds.

### Invoice (the module's core)

`invoice.controller.ts` — this milestone's own "Invoices" Controllers
list: Create, Issue, Void, Get, List — plus `PATCH` ("Update draft
invoice," a named Service responsibility not literally listed as a
Controller action — see the next paragraph and
`docs/implementation/decisions.md`).

`invoice.service.ts`:
- **"Create from Order"** — the only creation path this milestone
  builds (`clientId`'s own agency-billing path stays untouched and
  still unconsumed). Validates the `Order` (via `OrderRepository`,
  reused) and any given `taxRateId` (via `TaxRepository`, same module);
  builds one `InvoiceItem` per `OrderItem`, resolving its description
  from the product variant's own SKU (`ProductRepository`, reused from
  `CatalogModule`).
- **"Calculate totals"/"Calculate tax"** — `subtotalAmount` is the sum
  of the prepared `InvoiceItem.amount`s (never client-supplied);
  `taxAmount` is `TaxService.calculateTax()` (reused, not duplicated)
  against the resolved `TaxRate`, or zero when none is given;
  `totalAmount = subtotal + tax - discount` (`discountAmount` is the
  pre-existing Phase 1.1A column, always zero this milestone — no
  "Calculate discount" business rule was asked for).
- **"Invoice numbers generated automatically"** — `generateInvoiceNumber()`,
  a per-tenant-per-year sequence (`INV-{year}-{5-digit sequence}`) with
  a bounded retry-on-collision loop; the existing partial unique index
  on `(tenantId, invoiceNumber)` is the race-free backstop.
- **"Prevent modification after issuance"** — `assertEditable()`,
  shared by `update()`; `issue()`/`void()` are themselves the sanctioned
  ways to change a non-draft invoice's own status.
- **"Update draft invoice"** — not literally named in this milestone's
  own "Controllers" list, added anyway: leaving a named Service
  capability permanently unreachable would be the same "dead
  capability" gap Milestone 9's own audit caught and fixed for
  `LEAD_CREATED` — see `docs/implementation/decisions.md`. Recomputes
  `taxAmount`/`totalAmount` when `taxRateId` changes.
- **"Mark issued"** — `issue()`, DRAFT → SENT, stamps `issuedDate`.
- **"Void invoice"** — `void()`, from DRAFT/SENT/OVERDUE → VOID (never
  from PAID or VOID again).

### Payment

`payment.controller.ts` — this milestone's own "Payments" Controllers
list: Record, Allocate, Refund placeholder, Get, List — no
Update/Delete, `Payment` stays genuinely append-only (the database's
own pre-existing privilege revoke is the real backstop;
`payment.repository.ts` exposes no update method at all).

`payment.service.ts`:
- **"Record payment"** — creates a `Payment` row. When `invoiceId` is
  given, ALSO immediately allocates the full amount to it in the same
  transaction (the common single-invoice case); otherwise the payment
  is recorded unallocated, for a later `allocate()` call.
- **"Partial payment"/"Multiple payments"** — satisfied structurally:
  an invoice's own `amountPaid` accumulates across as many `Payment`/
  `PaymentAllocation` rows as needed.
- **"Allocate payment"** — applies (more of) an existing Payment's
  amount to a specific Invoice. "Payment allocations cannot exceed
  payment amount" (checked against the payment's own remaining
  unallocated balance, summed inside the transaction) and "Paid amount
  never exceeds invoice total" (checked against the invoice's own
  remaining balance — the database's own pre-existing
  `invoices_amount_paid_check` is the real backstop) are both
  re-verified inside the SAME transaction as the write.
- **"Mark invoice paid"** — when an allocation brings `amountPaid` up
  to `totalAmount`, the invoice's own `status` flips to `PAID`, in the
  same transaction as the `PaymentAllocation` write.
- **"Void invoices reject payments"** — both `record()` (when an
  `invoiceId` is given) and `allocate()` check the target invoice's own
  status first.
- **"Refund placeholder"** — a genuine stub, not a silent no-op:
  validates the payment exists (tenant-scoped), then throws
  `NotImplementedException` (`501`) explaining that real refund
  processing needs gateway integration, out of scope for this
  milestone. There is no row this could mutate even if it tried —
  `payments` has `UPDATE`/`DELETE` revoked at the database-privilege
  level.

### Tax

Full CRUD — `tax-rate.controller.ts`/`tax.service.ts`/
`repositories/tax.repository.ts` — this milestone's own "Tax — CRUD"
Controllers entry, named "TaxRepository" (not "TaxRateRepository") per
this milestone's own literal "Repository Layer" list, the same
"brief's own naming taken literally, even where it's slightly
inconsistent with the entity name" precedent Milestone 6's own
`MeasurementProfile`/`MeasurementRepository` asymmetry already
established. "Support multiple tax rates" is satisfied structurally
(any number of tenant-scoped rows); "Calculate totals" is
`calculateTax()`, reused by `InvoiceService`, not duplicated.
`PaymentMethod` gets NO controller/service/repository of its own, unlike
`TaxRate` — `Payment.method` (the required free-text column) already
satisfies every filter/display need on its own, so a `PaymentMethod`
row's absence never leaves anything unreachable the way a missing
`CustomerTag` write path would have in Milestone 9; rows exist only via
seed data. Same "no controller where nothing is left unsatisfiable
without one" reasoning `LeadSource` (Milestone 9) already established.

## Database

3 new tables (`TaxRate`, `PaymentMethod`, `PaymentAllocation`), plus
additive changes to the EXISTING `invoices`/`payments` tables (see each
model's own schema.prisma comment). Migration:
`20260722110000_add_payments_billing_foundation` — same fix classes as
every migration since Milestone 5's own: `payment_methods` (soft-
deletable) gets a hand-written **partial** unique index on
`(tenantId, slug)`. Two new `CHECK`-constraint classes:
`invoices_client_xor_customer_check` (exactly one of `client_id`/
`customer_id`, mirroring `quotations_lead_xor_client_check` exactly) and
`invoices_order_requires_customer_check` (`order_id` is only ever
meaningful alongside `customer_id`). The pre-existing
`invoices_amount_paid_check` needed no changes — it already enforces
this milestone's own "Paid amount never exceeds invoice total."
`payment_allocations` gets the SAME database-privilege-level
`UPDATE`/`DELETE` revoke `payments` already has — both are
financial-ledger rows this milestone's own brief asks no "un-allocate"
action for. Full RLS + all 3 standard policies for every one of the 3
new tables — verified live (3/3 tables, `rowsecurity = true`, 9/9
policies). Full detail: `docs/architecture/database-schema.md`.

## RBAC

Same `PermissionsGuard` convention as every prior domain module.
`invoices:read`/`invoices:write`/`payments:read` **already existed**
(Phase 1.1B's original billing seed, previously unconsumed) — reused
as-is, only their grants extended (`manager` gains `invoices:write`, it
already had `invoices:read`; `manager`/`customer` both gain
`payments:read`, previously granted to nobody at all). 6 new
permissions: `invoices:void` (Admin+-only, replacing where a `:delete`
key would normally go — no Invoice delete endpoint exists, Void is the
terminal write action), `payments:write` (covers Record + Allocate — no
`:delete`, Payment is append-only), `payments:refund` (Admin+-only),
`tax_rates:read`/`write`/`delete` (standard CRUD tiers).

| Tier | Roles | Grants |
|---|---|---|
| Read | `customer`, `manager`, `admin`, `super_admin` | `invoices:read`, `payments:read`, `tax_rates:read` |
| Write | `manager`, `admin`, `super_admin` | + `invoices:write`, `payments:write`, `tax_rates:write` |
| Void / Refund | `admin`, `super_admin` | + `invoices:void`, `payments:refund` |
| Delete (Tax only) | `admin`, `super_admin` | + `tax_rates:delete` |

`admin`/`super_admin` get every permission automatically
(`PERMISSIONS.map(p => p.key)`, unchanged by this milestone).

## Tenant isolation

Same structural discipline as every prior module: every repository
method takes `tenantId` as an explicit, mandatory, separate parameter,
always merged into the query by the repository itself, never trusted
from client input; `tenantId` always comes from `@Tenant()`. Extended to
every cross-entity reference this milestone introduces:
`CreateInvoiceDto.orderId`/`taxRateId`, `RecordPaymentDto.invoiceId`/
`paymentMethodId`, `AllocatePaymentDto.invoiceId` — each validated via a
repository existence check (own-tenant scoped) before being allowed to
reference it.

## Decimal arithmetic only

Every monetary computation uses `Prisma.Decimal`, never native JS
numbers — the same discipline `OrderService` already established in
Milestone 8. `TaxService.calculateTax()` rounds to 2 decimal places
(`toDecimalPlaces(2)`), matching every monetary column's own
`Decimal(12, 2)` scale.

## Known gap: no audit-column population

Same accepted gap as every prior module — `createdBy`/`updatedBy`/
`deletedBy` are left `null` everywhere in this module too, for the
identical reason (`RequestUser` has no `userId`). See
`docs/implementation/decisions.md`.

## What this module explicitly does NOT do

Stripe, Razorpay, PayPal, UPI gateway, webhooks, PCI storage, recurring
billing, subscription billing, accounting exports, ledger reconciliation,
email receipts — all explicitly out of this milestone's scope. Also not
built: direct `Client`-based (non-Order) invoicing (the pre-existing
`clientId` path stays schema-only, zero consumers, exactly as it was
before this milestone), a `PaymentMethod` controller (see "Tax" above),
and any real refund processing (`refundPlaceholder()` is a genuine stub,
not a partial implementation). See
`docs/architecture/domain-module-guide.md` for the general standards
this module follows.
