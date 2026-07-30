# FinanceModule (Phase 9, Module 1 — Enterprise Operations Suite: Finance)

This module owns vendor/expense/purchase-order records only — distinct
from `BillingModule` (Invoice/Payment/Tax, the agency's own
client-facing financial records) and `InventoryModule` (`Supplier` —
product/inventory sourcing, a different concept: who the agency sources
fabrics/finished-good variants FROM, not who it pays for
services/subscriptions/contractors). Tenant-isolated, RBAC-protected,
same conventions as every prior domain module.

## What's real here (Step 1 — Vendor Management)

`finance.module.ts` — `FinanceModule`, imported into `AppModule`. Not
`@Global()`. Imports nothing yet (Vendor has no cross-module reference);
`exports: [VendorRepository]` for future steps in this same module
(Purchase Orders/Expenses will reference `Vendor`).

`vendor.controller.ts` — Create/List/Get/Update, no Delete (no
`vendors:delete` permission — moving ACTIVE → INACTIVE/ARCHIVED happens
via `PATCH`'s own `status` field, same shape `ClientController`
establishes).

`vendor.service.ts` — same shape `ClientService`/`SupplierService`
establish: tenant-scoped CRUD, `slug` is client-supplied (validated
against `SLUG_PATTERN`, same convention `Supplier`/`CustomerTag` use, not
auto-generated), a `P2002` unique-constraint violation on
`(tenantId, slug)` is translated to a clean `ConflictException` (race-free
— no pre-check-then-insert TOCTOU).

## Why a new `Vendor` model, not a reused `Supplier`

`Supplier` (Milestone 7) models who the tenant sources fabrics/
finished-good variants FROM — full CRUD, but linked only to
`SupplierProduct` for inventory sourcing, no payment-terms/tax-ID
concept. `Vendor` models who the agency PAYS for goods/services
(contractors, software subscriptions, office supplies) — a different
business relationship this phase's brief calls for by name
("Vendor Management," distinct from Milestone 7's own "Supplier"
Controllers list). Conflating the two would misrepresent both.

## Database

New table `vendors` + `VendorStatus` enum
(`ACTIVE`/`INACTIVE`/`ARCHIVED`, same 3-state shape `ClientStatus`
establishes). Migration: `20260730120000_add_finance_vendor_management`.
Hand-written partial unique index `(tenantId, slug) WHERE deleted_at IS
NULL`, same convention `suppliers_tenant_id_slug_key` establishes. Full
RLS (tenant isolation + platform-admin override + service-maintenance
override), same 3-policy pattern every prior migration establishes.

**Also fixed this step**: `20260729090000_add_project_management`'s own
SQL redundantly re-declared `CREATE TYPE`/`CREATE TABLE`/RLS for six
tables already created by `20260717090000_init` +
`20260717091500_row_level_security` — broke a truly fresh database
replay (confirmed while generating this migration). Rewritten to contain
only the genuinely-new `comments` table's SQL. See
`docs/implementation/decisions.md`'s 2026-07-30 entry for the full
reasoning; no schema/data change resulted, metadata-only.

## RBAC

Same `PermissionsGuard` convention as every prior domain module. Two new
permissions, mirroring `clients:read`/`clients:write`'s own tier exactly
(no delete key — same reasoning `Client` gives):

| Tier | Roles | Grants |
|---|---|---|
| Read | `manager`, `project_manager`, `admin`, `super_admin` | `vendors:read` |
| Write | `manager`, `admin`, `super_admin` | + `vendors:write` |

`admin`/`super_admin` get every permission automatically
(`PERMISSIONS.map(p => p.key)`, unchanged by this step).

## Roadmap (Module 1 — Finance, this module keeps growing)

Step 1 (Vendor Management) is done. Steps 2-7, in dependency order,
extend this same module rather than creating new ones: Purchase Orders
(references `Vendor`), Expenses (references `Vendor`/`PurchaseOrder`/
`Project`), Invoice PDF+email delivery (extends `BillingModule`'s
`Invoice`, reusing `Quotation.send()`'s exact pattern — also closes
Phase 7's own open "wire DocumentPdfService/EmailService into Billing"
item), Refund Management (replaces `PaymentService.refundPlaceholder()`
with a real, record-keeping-only refund — no live payment-gateway call,
that's Module 9/Integrations), Tax Configuration (GST-ready — extends
`TaxRate` with HSN/SAC/CGST/SGST/IGST/GSTIN), and Revenue Dashboard/P&L/
Cash Flow (extends `AdminModule`'s `DashboardService` with a new
`finance` KPI entry, no new chart library — extends the existing
`StatsCard` grid). See `docs/implementation/progress.md`'s Phase 9 entry
and the approved plan for the full roadmap.

## What this module explicitly does NOT do (Step 1)

No Purchase Orders, Expenses, Refunds, GST tax fields, or dashboards yet
— those are Steps 2-7, not started. No vendor-facing portal/self-service
(Vendor is an internal record only, no login/access of its own, unlike
`Client`/`Customer`). No live GST e-filing/e-invoicing government API
integration (Module 9/Integrations concern, if ever built at all).
