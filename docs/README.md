# Antrique Web Studio — Research & Design Docs

This folder is the canonical record of the discovery-through-standards work that
precedes implementation. Each doc captures decisions and rationale so they aren't
relitigated and new contributors understand *why*.

## Reading order

### Product (`docs/product/`)
1. `01-discovery.md` — vision, mission, goals, personas, journey, competitors, risks
2. `02-information-architecture.md` — sitemap, navigation, mega menu, CTA strategy
3. `03-feature-design.md` — per-page spec across 15 dimensions
4. `04-ux.md` — journeys, wireframes, micro-interactions, CRO, responsive
5. `05-admin-dashboard.md` — internal operations console (19 modules)
6. `06-client-dashboard.md` — authenticated client portal
7. `07-roadmap.md` — six-sprint implementation plan

### Design system (`docs/design-system/`)
- `design-system.md` — tokens, components, theming, accessibility
- implemented in `apps/web/src/styles/tokens` + the component library

### Architecture (`docs/architecture/`)
- `architecture.md` — full production architecture (18 areas)
- `database.md` — schema, relationships, indexes, RBAC, audit, scalability
- `api.md` — REST design (auth, CRUD, pagination, versioning, errors)
- `seo.md` — technical SEO architecture
- `security.md` — defense-in-depth security architecture
- `optimization.md` — production performance strategy
- `adr/` — architecture decision records
- `diagrams/` — C4, sequence, deployment, ERD

### Standards (repo root + ADR)
- `CONTRIBUTING.md` — engineering standards
- `docs/architecture/adr/0001-engineering-standards.md`

## Status
All phases are **design-complete**. Implementation follows the roadmap
(`docs/product/07-roadmap.md`), conversion spine first.

## Key open decisions (carried across phases)
- Business model: hybrid services agency + platform + portal — confirm.
- Geography/compliance: India-first (DPDP) — confirm.
- Beachhead vertical: narrow the 15-service x 11-industry scope to one first.
- Named technologies are defaults; the stated category is the requirement.
