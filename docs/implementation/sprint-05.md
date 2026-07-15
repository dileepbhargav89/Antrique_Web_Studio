# Sprint 5 — Billing + Collaboration  ◆ MILESTONE M2

**Goal:** money and communication — completes the portal.
**Milestone M2:** Portal live — recurring-revenue loop closed.
**Design refs:** docs/product/06-client-dashboard.md, docs/architecture/security.md

## Status: ⬜ Not started

## Tasks
- [ ] **Invoices** (M) — list, detail, PDF
  - depends on: DB billing, portal
- [ ] **Payments** (L — HIGHEST RISK, buffer this) — hosted gateway + webhooks
  - depends on: invoices, gateway. Card data NEVER touches our servers.
- [ ] **Recurring / retainer billing** (M)
  - depends on: payments
- [ ] **Tickets** (M) — support + change requests, status history
  - depends on: portal, projects
- [ ] **Messages** (M) — project thread
  - depends on: portal
- [ ] **Meetings** (M, Could — cut first if tight)
  - depends on: portal
- [ ] **Notifications** (M) — in-app + email
  - depends on: queue, ESP

## Exit check ◆ M2
Client tracks work, pays an invoice via hosted gateway, raises a ticket, gets notified.
Payments has E2E tests + webhook signature verification.
