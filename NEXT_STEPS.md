# Next Steps — Prioritized Roadmap

Written at the 2026-08-03 development freeze. See `PROJECT_STATUS.md` for
the full current-state snapshot this roadmap is based on. Ordered roughly
by value-for-effort, highest first — re-validate priorities against real
business needs before starting any of it, since months may have passed.

## 0. Move the repo outside OneDrive sync before resuming local dev

Found during this freeze's verification pass: the working copy lives
inside a OneDrive-synced folder, which triggers a continuous spurious
file-change loop in `nest start --watch`, intermittently taking the local
API down and possibly causing the CRM Clients/Orders loading hangs
observed during testing (see `PROJECT_STATUS.md` §4). Free, five-minute
fix, do this **before** spending time debugging anything that looks like a
frontend data-fetching bug locally — retest Clients/Orders/Inventory/
Projects/Catalog/Admin in a clean environment first to see if the issue
was environment noise all along.

## 1. Finance module — Steps 2–7

Highest leverage: closes the platform's one genuinely "partially built"
module, and closing Step 5 (Refunds) also removes the only 501-stub
endpoint reachable by a real user today.

- Step 2 — Purchase Orders (`PurchaseOrder`/`PurchaseOrderItem`, references
  `Vendor`)
- Step 3 — Expenses (references `Vendor`/`PurchaseOrder`/`Project`)
- Step 4 — Invoice PDF + email delivery (extends `BillingModule`; also
  closes the older open Phase 7 item "wire `DocumentPdfService`/
  `EmailService` into Billing")
- Step 5 — Refund Management (replaces
  `PaymentService.refundPlaceholder()` with a real, record-keeping-only
  refund — full gateway integration is a separate, larger item, see §4)
- Step 6 — Tax Configuration (GST-ready: HSN/SAC/CGST/SGST/IGST/GSTIN on
  `TaxRate`)
- Step 7 — Revenue Dashboard/P&L/Cash Flow (new `finance` KPI in
  `AdminModule`'s `DashboardService`)

Full spec: `apps/api/src/modules/finance/README.md`.

## 2. Phase 10 — remaining hardening modules (12–15)

Cheap relative to feature work, closes out the production-engineering
pass cleanly:

- Module 12 — Testing (coverage audit/gap-fill)
- Module 13 — Docs (this freeze pass already did a bounded version of
  this; Module 13 as originally scoped may want to go further)
- Module 14 — Tech debt (start from §5 "Technical debt" in
  `PROJECT_STATUS.md`)
- Module 15 — Readiness report

## 3. Phase 8 AI Workspace — build the missing UI

Six backend-complete features (Proposal Generator, Requirement Analyzer,
Project Estimator, Task Generator, Content Assistant, Email Assistant)
have no `apps/web` UI at all. **Before starting:** confirm the
`ANTHROPIC_API_KEY` account has a real credit balance — it did not at the
time of this freeze, and every one of these features calls that API
live.

## 4. Payment gateway integration

Currently all `PAYMENT_GATEWAY_*` env vars are placeholders — no gateway
is wired. This blocks real refunds (beyond the record-keeping-only version
in §1 Step 5) and any real card processing. Per `CLAUDE.md`'s non-
negotiable rule: never handle raw card/credential data, route through a
hosted gateway, never auto-submit for a user. Pick a gateway before
starting (Razorpay/Stripe/PayU are the common India-compatible options;
not yet decided in this repo).

## 5. Managed IdP/OIDC wiring

Auth currently works entirely on local JWT/password. `IDP_ISSUER_URL`/
`IDP_CLIENT_ID`/`IDP_CLIENT_SECRET` exist as unused placeholders. Only
worth doing if there's a real SSO requirement (enterprise client demand,
internal staff SSO) — don't build this speculatively.

## 6. Remaining 14 Phase 9 "Enterprise Ops" modules

Contracts, HR, Resource Planning, Time Tracking, Help Desk, Knowledge
Base, Calendar, Integrations, Analytics, Search, Automation, Audit,
Feature Flags, Quality Review — all zero code. **Explicitly lowest
priority.** This list was originally planned speculatively; before
starting any single one of them, re-scope against actual client/business
need at the time development resumes. Don't treat "planned" as "needed."

## 7. Documentation follow-ups

- Recover/rewrite the lost `docs/product/04-UX.md` (the swapped-content
  bug in `docs/implementation/blockers.md` — 5 of 6 affected files are
  recoverable by remapping, this one isn't; it needs to be rewritten from
  scratch or reconstructed from whatever original source exists outside
  the repo).
- Resolve the three open product/business decisions in `blockers.md`
  (business model, India/DPDP compliance approach, beachhead vertical) —
  these were still unconfirmed as of the freeze and will shape schema/
  scope for anything built afterward.
- If Phase 9/10 work resumes, keep `CHANGELOG.md` current going forward —
  it was a placeholder for the platform's entire first year of
  development before this freeze pass backfilled it; don't let that gap
  reopen.
