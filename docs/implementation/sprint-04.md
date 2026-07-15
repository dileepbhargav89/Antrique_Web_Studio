# Sprint 4 — Portal Core

**Goal:** the authenticated client surface — the transparency product.
**Milestone:** portal core usable — status visibility delivered.
**Design refs:** docs/product/06-client-dashboard.md

## Status: ⬜ Not started

## Tasks
- [ ] **Portal shell** (M) — sidebar nav, auth-gated, project switcher
  - depends on: Sprint 1 auth, design system
- [ ] **Dashboard home** (M) — "where are we?" in first viewport
  - depends on: portal shell
- [ ] **Project tracking + milestone timeline** (L)
  - depends on: DB projects, portal shell
- [ ] **Milestone review loop** (M) — approve / request changes (confirmed action)
  - depends on: project tracking
- [ ] **Documents** (M) — upload (pre-signed, scanned), download (signed URL)
  - depends on: storage
- [ ] **Timeline (event feed)** (M)
  - depends on: projects
- [ ] **Client profile + settings** (S)
  - depends on: auth

## Exit check
A client logs in, sees live project status, reviews a milestone, exchanges a document.
