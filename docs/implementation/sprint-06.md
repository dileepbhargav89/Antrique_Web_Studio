# Sprint 6 — Admin Console + Hardening  ◆ MILESTONE M3

**Goal:** operational tooling + production-readiness.
**Milestone M3:** Production launch — hardened, monitored, DR-tested.
**Design refs:** docs/product/05-admin-dashboard.md, docs/architecture/{security,optimization}.md

## Status: ⬜ Not started

## Tasks
- [ ] **Admin console — operations modules** (L) — leads, clients, projects
  - depends on: Sprint 3/4 data
- [ ] **Content modules** (L) — services, blog, media, testimonials, FAQs
  - depends on: CMS
- [ ] **Permissions + audit log admin** (M)
  - depends on: RBAC, audit
- [ ] **Analytics + SEO admin modules** (M)
  - depends on: analytics
- [ ] **Security hardening** (L) — WAF, CSP, pen-test, secrets audit
  - depends on: everything
- [ ] **Performance pass** (M) — budgets, Core Web Vitals
  - depends on: everything
- [ ] **Observability** (M) — dashboards, alerts, DR drill
  - depends on: infra
- [ ] **Production launch** (M) — multi-env, blue-green deploy

## Exit check ◆ M3
Full platform live, hardened, monitored, with a tested disaster-recovery path.
