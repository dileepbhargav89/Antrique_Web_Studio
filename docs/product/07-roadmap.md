# 07 — Implementation Roadmap

Conversion spine first, portal second. Complexity in T-shirt sizes (S/M/L/XL).
Cross-cutting quality (test, a11y, security, observability, docs) runs through
EVERY sprint — not a final phase.

## Sprint 1 — Foundation
Scaffold+tooling (S), DB schema+migrations+RLS (L), Auth/IdP/JWT (L), RBAC (M),
CI/CD (M), infra baseline (L), shared types+OpenAPI skeleton (M).
**Milestone:** foundation ready — auth works, DB enforces tenant isolation,
deploys to staging.

## Sprint 2 — Marketing site
Design system→code (L), layout (M), Home (M), Service template ×15 (L),
Industry template ×10 (M), Work gallery (M), content model (M), SEO layer (M).
**Milestone:** marketing site live, indexable, hits CWV budget.

## Sprint 3 — Conversion + CRM
Quote wizard (L), lead capture (M), contact form (S), confirmation+email (M),
pricing (S), CRM pipeline (M), transactional email (M).
**◆ M1: Public funnel live — the business can generate leads.**

## Sprint 4 — Portal core
Portal shell (M), dashboard home (M), project tracking+timeline (L), milestone
review loop (M), documents (M), timeline feed (M), profile+settings (S).
**Milestone:** portal core usable — status visibility delivered.

## Sprint 5 — Billing + collaboration
Invoices (M), payments+webhooks (L — highest risk, buffered), recurring billing
(M), tickets (M), messages (M), meetings (M, Could), notifications (M).
**◆ M2: Portal live — recurring-revenue loop closed.**

## Sprint 6 — Admin + hardening
Admin ops console (L), content modules (L), permissions+audit admin (M),
analytics/SEO admin (M), security hardening (L), performance pass (M),
observability+DR drill (M), production launch (M).
**◆ M3: Production launch — hardened, monitored, DR-tested.**

## Prioritization (MoSCoW)
Must = critical path to a milestone. Should = survives a short slip. Could =
deferrable. Under pressure: Coulds drop first, Shoulds slip; Musts never drop.

## Dependency spine
Auth+DB+RBAC block everything → S1. Design system blocks all UI. Templates block
the 25 content pages. Projects data blocks billing+collab. Payments depends on the
external gateway (buffered). Admin depends on S3–S5 data models.
