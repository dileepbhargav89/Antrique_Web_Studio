# 05 — Admin Dashboard (internal operations console)

The internal delivery/operations surface (distinct from the client portal).
19 modules in four groups; every module inherits list+detail views, RBAC gating,
audit logging, soft-delete, status fields, and standard states.

## Operations
- **Dashboard** — "what needs attention today?" (leads, projects, milestones,
  overdue invoices, contact requests).
- **Leads** — CRM pipeline board (new→qualified→quoted→converted→lost);
  convert-to-project bridge.
- **Clients** — tenant/account records; manage portal access; suspend (step-up).
- **Projects** — delivery console; milestones, team, assets, change requests.
- **Contact Requests** — unqualified inbound inbox; convert-to-lead.
- **Careers** — job postings + applications inbox.

## Content (CMS, draft→publish + ISR revalidate)
Services, Pricing, Blogs, Media (alt text required), Testimonials (verified flag),
FAQs.

## Growth
Newsletter (consent-first, export to ESP), SEO (metadata, redirects, sitemap),
Analytics (quote funnel, CWV, recurring-revenue mix).

## System
Settings (secrets never shown in plaintext), Permissions (RBAC admin, step-up +
audit), Audit Logs (read-only, immutable), Notifications (internal alerts).

## Notes
Sidebar nav (not mega menu). RBAC visible-and-enforced: inaccessible modules
don't render, but server enforces regardless. Content and operations modules each
reuse one shared pattern.
