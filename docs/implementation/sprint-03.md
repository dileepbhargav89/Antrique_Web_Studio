# Sprint 3 — Conversion + CRM  ◆ MILESTONE M1

**Goal:** turn visitors into qualified leads. Completes the revenue engine.
**Milestone M1:** Public funnel live — the business can generate leads.
**Design refs:** docs/product/03-feature-design.md (quote wizard),
docs/architecture/api.md

## Status: ⬜ Not started

## Tasks
- [ ] **Quote wizard** (L) — multi-step, per-step validation, pre-fill, trust rail
  - depends on: design system, API. USER-INITIATED submit, never auto-submit.
- [ ] **Lead capture + persistence** (M)
  - depends on: DB, API
- [ ] **Contact form + contact requests** (S)
  - depends on: API
- [ ] **Confirmation flow** (M) — thank-you page + async confirmation email
  - depends on: ESP, queue
- [ ] **Pricing page** (S)
  - depends on: design system
- [ ] **CRM lead pipeline (admin-side)** (M) — board new→qualified→…→converted
  - depends on: leads, RBAC
- [ ] **Transactional email setup** (M) — ESP, SPF/DKIM/DMARC
  - depends on: infra

## Exit check ◆ M1
A prospect can discover → research → submit a quote → get confirmation, and the
team receives the lead. STOP HERE and validate demand before building the portal.
