# Phase 7 — Business Workflow Matrix

Produced per Phase 7 Step 1 (Business Workflow Audit), before any implementation.
Findings are from direct code reads of `apps/api` and `apps/web` as of 2026-07-29
(working tree state, uncommitted since `v1.0.0`/`27ae571`) — not from docs, which
were not trusted as sole source per [[feedback-antrique-workflow]].

Legend: ✅ Complete · 🟨 Partial (named gaps) · ⬜ Missing entirely

## Lifecycle stages

| Stage | Status | Detail |
|---|---|---|
| **Lead** | 🟨 | CRUD, pipeline enum (`NEW→QUALIFIED→QUOTED→CONVERTED/LOST/ARCHIVED`), dedup-by-email, two real conversion paths (→Customer, →Client) with `CustomerActivity` audit rows. Web list has search/filter/sort. **Gaps:** no `priority` field anywhere; `CustomerTag`/`CustomerNote`/`CustomerActivity` exist but only attach to `Customer`, not pre-conversion `Lead`; lead detail page renders none of tags/notes/timeline/follow-ups even though `FollowUpTask` supports lead-anchored tasks; no file attachments or email-history log on Lead. |
| **Qualified Lead** | ✅ | `QUALIFIED` is a real pipeline status, transitions enforced in `lead.service.ts`. |
| **Proposal (Quotation)** | 🟨 | Full CRUD + send/accept/reject actions. **Real PDF generation** (`pdfkit` via `document-pdf.service.ts`, not a stub), stored via StorageService, emailed on send. **Gaps (explicitly descoped in `crm/README.md`):** no proposal templates, no revision history (the `version` column is an optimistic-lock counter, not a version chain), no attachments on a quotation. |
| **Client** | 🟨 | CRUD complete; schema has relations to projects/quotations/invoices/testimonials/users. **Gaps:** `client-detail.tsx` UI renders only name/industry/website/phone/status — none of the related projects/quotations/invoices/payments/notes are displayed despite being queryable; no multi-contact sub-entity (single `primaryEmail`/`primaryPhone` only); no contract/file storage tied to Client; no Client-scoped communication history (`CustomerNote`/`CustomerActivity` are Customer-scoped only). |
| **Project** | ⬜ | **Missing entirely.** `apps/api/src/modules/projects/` and `content/` are README-only placeholders, not even imported in `app.module.ts`. Prisma schema has full `Project`/`ProjectMember`/`Milestone`/`Task`/`Document` models (schema.prisma:584–794) sitting completely unused. Frontend `(portal)/projects/` directory exists but is empty. This matches the known Sprint 5 "collab" gap already logged in `progress.md`. |
| **Milestones** | ⬜ | Missing entirely — same as Project (schema-only, zero API/UI). `MilestoneStatus` enum includes a `CHANGES_REQUESTED` review-loop state already modeled. |
| **Invoices** | 🟨 | Create-from-Order, Issue, Void, Update(draft), List/Get. Partial payments work structurally (`Invoice.amountPaid` accumulates via `PaymentAllocation`, auto-flips to PAID). **Gaps:** `OVERDUE` status exists but nothing transitions SENT→OVERDUE (no scheduled job); no invoice PDF (the reusable `DocumentPdfService` explicitly supports invoices per its own comment but billing module never calls it); no "email invoice" action (EmailService exists, reused by newsletter/contact/quotation, not by billing). |
| **Payments** | 🟨 | Record/Allocate/List/Get implemented. **Gap:** refunds are an explicit stub — `PaymentService.refundPlaceholder()` always throws `NotImplementedException` (by design, gateway integration out of scope). Web UI has no "record payment" form. |
| **Delivery** | — | Not directly audited this pass. `orders` module has status + history (`change-order-status.dto.ts`, `order-status-history-response.dto.ts`) but no explicit "delivery" concept beyond order status. Needs its own look before Step-8-adjacent work touches it. |
| **Support** | — | Not directly audited this pass. `(portal)/support` exists as a directory (seen incidentally) but wasn't read. |
| **Archive** | ✅ | `ARCHIVED` is a real status on both `Lead` and `Client`. |

## Cross-cutting infrastructure (used across multiple stages)

| Capability | Status | Detail |
|---|---|---|
| **PDF generation** | 🟨 | `DocumentPdfService` (pdfkit) is real and shared-by-design ("one render() covers both Quotation and Invoice" per its own comment). Currently called only by `quotation.service.ts` — billing never wires it in. |
| **Email service** | 🟨 | `EmailService` (Resend) is real and reused (newsletter, contact, quotation-send). Billing never calls it. |
| **Storage service** | 🟨 | S3-compatible, but `upload()`-only — no preview, versioning, categories, tags, permissions, or replace. Sole real consumer today is product images. |
| **Generic document management** | ⬜ | No module exists for arbitrary file upload/version/category/tag/permission — only the narrow product-image path and the unused `Document` Prisma model tied to the unbuilt Project module. |
| **Notifications** | 🟨 | Model is fully fleshed (channel, retry, read/dismissed, deep-link fields) and List/Get/Retry routes exist, but retry is state-only — **no real delivery transport exists anywhere** (README explicitly says "Do NOT Implement: email/SMS/push providers"). Nothing in the codebase calls `NotificationService.create()` from a business event — leads, invoices, orders never trigger a notification. No mark-read/dismiss route despite the columns existing. No bulk actions. |
| **Audit logs** | 🟨 | Schema has every target field (actor, action, resource, before/after, IP, user agent), immutability enforced at 3 layers, RBAC-gated to admin/super_admin — solid. **But it's an isolated island**: nothing outside the admin module itself calls it except `NotificationService.retry()`. Lead/invoice/order/payment writes create zero audit trail today. `ipAddress`/`userAgent` are never populated by any real caller. |
| **Reporting/dashboards** | 🟨 | `GET /dashboard/overview` + per-module KPIs (orders, inventory, CRM, billing, catalog) exist, numbers-only. **Missing:** sales pipeline, project completion, team utilization, customer growth, monthly trend series — and no charting library/component exists anywhere in `apps/web` (only tables). |
| **RBAC** | ✅ | Existing permission system is reused correctly everywhere audited (audit-log gating confirmed real). |

## What this means for Phase 7's remaining steps

The spec assumes greenfield in places where the codebase is actually already partial —
and assumes shallow in one place (Project/Milestone/Task) where it's actually a complete
void with a fully-designed but unused schema underneath. Concretely:

- **Steps 2–4 (Lead/Proposal/Client mgmt)** are UI-wiring and small-model-extension work,
  not new systems — the backend CRUD, PDF, and email plumbing already exists. Cheapest wins.
- **Steps 5–7 (Project/Task/Milestone)** are the one true greenfield build in this list —
  schema exists, nothing else does. This is the largest single chunk of new work.
- **Step 8 (Invoice/Payment)** is mostly "wire two already-built services (PDF, Email)
  into billing" plus a scheduled job for overdue transitions — small, high-leverage.
- **Step 9 (Documents)** is genuinely new (no generic document system exists), but should
  reuse the already-unused `Document` Prisma model once Projects exist, rather than
  inventing a second document model.
- **Steps 10–13 (Activity/Notifications/Reporting/Audit)** all have real schemas and partial
  plumbing already in place but are functionally inert — the work is "make existing
  infrastructure actually fire on business events," not building new infrastructure.
- **Step 14 (repo refactor)** should follow, not precede, the above — premature to dedupe
  CRUD/forms before Project/Document work adds its own new instances of the same patterns.

No backend capability was fabricated to produce this matrix — every ✅/🟨/⬜ above is
sourced from a direct code read (see individual audit citations retained in this session).
