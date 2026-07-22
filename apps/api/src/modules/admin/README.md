# AdminModule (Milestone 11 — Admin Platform, Analytics & Notifications)

"This module provides operational visibility. It does not own business
transactions" (this milestone's own framing). Four controller/service/
repository triads — Notification, Audit (covering both `AuditLog` and
`SystemEvent`), Dashboard, Report — on top of `Notification`/`AuditLog`
(reused wholesale), `NotificationTemplate`, `SystemEvent`,
`DashboardWidget`, `ScheduledReport`. Tenant-isolated, RBAC-protected,
cross-module analytics aggregation over Orders/Inventory/CRM/Billing/
Catalog.

## Architecture audit (before writing any code)

A repo-wide search for `Notification`/`AuditLog`/`SystemEvent`/
`Dashboard`/`Report` found `Notification`/`AuditLog` already fully
modeled since Phase 1.1B, with **zero application-layer consumers** — no
`NotificationRepository`/`AuditRepository`/`NotificationService`/
`AuditService`/`NotificationController`/`AuditController` existed
anywhere, the same "schema exists, first real consumer" situation
Milestones 3, 9, and 10 already found. `AuditLog` needed zero schema
changes (pure reuse — see its own updated schema.prisma comment).
`Notification` needed additive-only changes: this milestone's own
"Notification status lifecycle"/"Failed notifications are retryable"
business rules require DELIVERY state (`status`/`sentAt`/`failedAt`/
`retryCount`/`lastError`) the pre-existing model never tracked (it only
tracked recipient interaction — `readAt`/`dismissedAt`). No
`NotificationTemplate`/`SystemEvent`/`DashboardWidget`/`ScheduledReport`
entities existed anywhere. Full reasoning for every non-obvious call:
`docs/implementation/decisions.md`.

**Removed the stale `modules/notifications/` scaffold.** Phase 0 had
already scaffolded an empty `apps/api/src/modules/notifications/`
folder (a placeholder README + empty `controllers/`/`dto/`/`entities/`/
`repositories/`/`services/` dirs, zero real files). This milestone's own
brief names the module `AdminModule`, not `NotificationsModule` — it
covers FOUR areas (Notification, Audit, Dashboard, Report), not just
Notifications, so reusing that one differently-scoped scaffold folder
the way `CrmModule`/`BillingModule` reused their own matching Phase 0
scaffolds would have been a poor fit. Building the real feature under
`admin/` instead left the old `notifications/` scaffold empty, unused,
and actively misleading (a future reader could mistake it for
"Notifications not built yet") — removed rather than left to rot. Its
one referencing comment (`apps/api/src/config/notifications/README.md`)
updated to point here instead.

## What's real here

- `admin.module.ts` — `AdminModule`, imported into `AppModule`. Not
  `@Global()`. **Imports FIVE other modules** — the most cross-module-
  dependent module in this arc, directly matching this milestone's own
  "Cross-Module Integration" analytics requirements: `OrdersModule`
  (exported `OrderRepository`, "Orders: Revenue, Order count, Average
  order value"), `InventoryModule` (exported `InventoryService`,
  "Inventory: Stock valuation, Low stock items"), `BillingModule`
  (exported `InvoiceRepository`, "Billing: Outstanding invoices,
  Collection rate"), `CrmModule` (exported `LeadRepository`/
  `FollowUpRepository`, "CRM: Lead conversion, Active follow-ups"), and
  `CatalogModule` (exported `ProductRepository`, this module's own 5th —
  "catalog" — aggregated KPI, see below). One-directional; none of those
  five modules import `AdminModule` — "Zero circular dependencies"
  holds.

### Notification

`notification.controller.ts` — this milestone's own "Notifications"
Controllers list, read literally: "List, Get, Retry placeholder" —
three routes.

`notification.service.ts`:
- **"Create"** — either an explicit `title`/`body`, or a `templateKey`
  resolved via `NotificationRepository.findActiveTemplateByKey()`
  (mirrors `LeadService.resolveSourceText()`'s own dual-input pattern).
  Starts at `PENDING`.
- **"Queue"/"Mark sent"/"Mark failed"** — the rest of the status
  lifecycle (`PENDING → QUEUED → SENT`, or `→ FAILED` with `failedAt`/
  `lastError` stamped).
- None of the four above get a public route this milestone — this
  milestone's own "Notifications" Controllers list is "List, Get, Retry
  placeholder" only; every real notification will be created by a
  FUTURE feature's own business event (an order shipping, an invoice
  being paid, ...) that doesn't exist yet — the same "real, tested
  capability, no route because no real caller needs one yet" precedent
  Milestone 7's own `consumeReservation()` established.
- **"Retry placeholder"** — the ONE action this milestone exposes
  publicly (`POST /notifications/:id/retry`): resets a FAILED
  notification back to `PENDING`, increments `retryCount`. A genuine
  placeholder — this milestone's own "Do NOT Implement: Email delivery
  providers, SMS providers, Push notifications" means nothing actually
  re-delivers the message; only the STATE transition is real. The
  request body's own `note` field (`RetryNotificationDto`) has nowhere
  to live on `Notification` itself, so it's recorded on an `AuditLog`
  row this method writes instead — CLAUDE.md's own non-negotiable
  "every feature ships with... audit logging" rule, applied to this
  milestone's one real mutation-with-a-route.

### Audit (AuditLog + SystemEvent)

`audit.controller.ts` — this milestone's own "Audit" Controllers list:
"List, Search" — one route; `search` is a query param on the same list
endpoint (an `OR` across `action`/`resourceType`), not a separate route.

`audit.service.ts`:
- **"Record security events"/"Record business events"** — two named
  methods (`recordSecurityEvent()`/`recordBusinessEvent()`), both
  ultimately writing to the SAME `AuditLog` table via one private
  `recordEvent()` — `AuditLog.action` is free-text, so "security.x" vs.
  "business.y" is a naming CONVENTION future callers apply, not a
  schema-level distinction; no artificial behavioral difference is
  forced between the two methods.
- **"Immutable audit history"** — no update method exists anywhere in
  this service or `AuditRepository`; enforced structurally here AND at
  the database-privilege level (`UPDATE`/`DELETE` revoked on both
  `audit_logs` and `system_events`).
- `recordSystemEvent()` — the write side of the `SystemEvent` ledger,
  defaulting `severity` to `INFO`.

### Dashboard

`dashboard.controller.ts` — this milestone's own "Dashboard" Controllers
responsibilities: "Overview" (`GET /dashboard/overview`) and per-module
"KPI endpoints" (`GET /dashboard/kpis/:module`).

`dashboard.service.ts` — one private method per aggregated module, each
reaching ONLY the already-exported artifact of its source module (a
repository where that's what's exported, a service where only the
service is exported — see each source module's own updated `exports`
comment):
- **"Orders: Revenue, Order count, Average order value"** —
  `OrderRepository.getRevenueSummary()`.
- **"Inventory: Stock valuation, Low stock items"** —
  `InventoryService.getStockValuation()`/`getLowStockItems()`.
- **"CRM: Lead conversion, Active follow-ups"** — plain `count()` calls
  on `LeadRepository`/`FollowUpRepository` (no new aggregate method
  needed on either — a lead-conversion rate and an active-follow-up
  count are both `count()` + a `where` clause).
- **"Billing: Outstanding invoices, Collection rate"** —
  `InvoiceRepository.getOutstandingSummary()`/`getCollectionSummary()`.
- **`catalog`** — a 5th aggregated module beyond this milestone's own
  explicitly-named four, added because `DASHBOARD_KPI_MODULES` (this
  module's own constant) already names it as a valid
  `GET /dashboard/kpis/:module` value; a named-but-unimplemented module
  would be the same "dead capability" mistake this codebase's own
  established discipline rejects elsewhere. Its one metric — published
  product count — reuses `ProductRepository` (already exported by
  `CatalogModule` since Milestone 6).
- **"Dashboard Overview"** — one KPI summary per aggregated module, plus
  the tenant's own active `DashboardWidget` set (`findActiveWidgets()` —
  a real read consumer, not dead schema, even without a widget-write
  endpoint), plus a lightweight system-health signal
  (`systemErrorCount24h` — ERROR-severity `SystemEvent` rows in the
  trailing 24 hours, via `AuditRepository.countSystemEventsBySeverity()`,
  that method's own comment already naming this as its intended
  consumer).

### Report (ScheduledReport)

`report.controller.ts` — this milestone's own "Reports" Controllers
list: "Generate, List, Download metadata" — three routes.
`generatedByUserId` is left unset on generate — same known, accepted gap
as `createdBy`/`updatedBy`/`deletedBy` everywhere else in this codebase
(`RequestUser` is `{ email }` only, no `userId` in the request pipeline
to populate it with).

`reporting.service.ts`:
- **"Generate"** — computes a snapshot via `DashboardService.getKpis()`
  (a `REPORT_TYPE_TO_MODULE` map: `SALES_SUMMARY → orders`,
  `INVENTORY_SUMMARY → inventory`, `CRM_SUMMARY → crm`,
  `BILLING_SUMMARY → billing`), persists it as an immutable
  `ScheduledReport` row — "Never duplicate calculations already
  available elsewhere" (this milestone's own explicit instruction);
  `ReportingService` does NOT re-implement any aggregate query itself.
- **"List"** — paginated, filterable by `type`/date range.
- **"Download metadata"** — `findById()`; "download" here means
  returning the already-stored `result` JSON snapshot, not producing a
  file — no file-format generation (PDF/CSV) is built.

`ReportRepository` is a 4th repository beyond this milestone's own named
"Repository Layer" list (Notification/Audit/Dashboard) — added because
`ScheduledReport` IS a named "Core entity" with its own Controllers but
no repository was named for it; without one it would be dead schema, the
same class of judgment call `CustomerTagRepository` (Milestone 9)
already established. No update method at all — "Reports are immutable
after generation" (this milestone's own explicit rule), enforced
structurally here AND at the database-privilege level (`UPDATE`/`DELETE`
revoked on `scheduled_reports`).

## Database

4 new tables (`NotificationTemplate`, `SystemEvent`, `DashboardWidget`,
`ScheduledReport`), plus additive changes to the EXISTING `notifications`
table (see its own schema.prisma comment). Migration:
`20260722120000_add_admin_platform_analytics_notifications` — same fix
classes as every migration since Milestone 5's own: `notification_templates`/
`dashboard_widgets` (both soft-deletable) each get a hand-written
**partial** unique index (`(tenantId, key, channel)` /
`(tenantId, key)`, both `WHERE deleted_at IS NULL`). Two new `CHECK`
constraints: `notifications_retry_count_check`/
`dashboard_widgets_sort_order_check` (both `>= 0`). `system_events`/
`scheduled_reports` get the SAME database-privilege-level `UPDATE`/
`DELETE` revoke `payments`/`audit_logs`/`payment_allocations` already
have — both are append-only ledgers this milestone's own brief asks no
edit/delete action for. Full RLS + all 3 standard policies for every one
of the 4 new tables — verified live (4/4 tables, `rowsecurity = true`,
12/12 policies; ledger-table grants for `system_events`/
`scheduled_reports` confirmed limited to `INSERT`+`SELECT` only for
`antrique_app`/`antrique_service`). Full detail:
`docs/architecture/database-schema.md`.

## RBAC

Same `PermissionsGuard` convention as every prior domain module.
`audit_logs:read` **already existed** (Phase 1.1B's original seed),
never granted to any role other than `admin`/`super_admin` — reused
as-is, zero seed changes needed to already match this milestone's own
"Audit: Admin, Super Admin" tier. `notifications:read` (also Phase
1.1B) is deliberately NOT reused for this milestone's admin surface —
its own seed description ("View own notifications") and existing broad
grant list (project_manager/sales/client/manager/customer) describe a
different, narrower, self-service scope this milestone doesn't build a
route for; reusing it would silently over-grant the admin List/Get/Retry
surface to Sales/Client/Customer. 4 new permissions instead:
`notifications:manage` (List/Get/Retry — one uniform tier, not a finer
read/write split), `dashboard:read`, `reports:read`, `reports:write`.

| Tier | Roles | Grants |
|---|---|---|
| Notifications/Dashboard/Reports | `manager`, `admin`, `super_admin` | `notifications:manage`, `dashboard:read`, `reports:read`, `reports:write` |
| Audit | `admin`, `super_admin` only | `audit_logs:read` |

`admin`/`super_admin` get every permission automatically
(`PERMISSIONS.map(p => p.key)`, unchanged by this milestone).

## Tenant isolation

Same structural discipline as every prior module: every repository
method takes `tenantId` as an explicit, mandatory, separate parameter,
always merged into the query by the repository itself, never trusted
from client input; `tenantId` always comes from `@Tenant()`.

## Known gap: no audit-column population

Same accepted gap as every prior module — `createdBy`/`updatedBy`/
`deletedBy` (on `NotificationTemplate`/`DashboardWidget`) and
`generatedByUserId` (on `ScheduledReport`, when generated via the
controller) are left `null`, for the identical reason (`RequestUser` has
no `userId`). See `docs/implementation/decisions.md`.

## What this module explicitly does NOT do

Email delivery providers, SMS providers, push notifications, real-time
WebSockets, Grafana/Prometheus/Elasticsearch integration, scheduled cron
execution, external BI integrations — all explicitly out of this
milestone's scope. Also not built: a `NotificationTemplate`/
`DashboardWidget` write endpoint (both are schema-only + seed-data, the
same "no controller where nothing is left unsatisfiable without one"
precedent `LeadSource`/`PaymentMethod` already established), and report
file generation (PDF/CSV — "Download metadata" returns the stored JSON
snapshot, not a file). See `docs/architecture/domain-module-guide.md`
for the general standards this module follows.
