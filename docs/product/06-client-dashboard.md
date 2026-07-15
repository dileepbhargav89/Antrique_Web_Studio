# 02 — Information Architecture

## Two-surface architecture
Public marketing site (SSG/ISR, SEO, unauthenticated) + authenticated client
portal — distinct navigation, footers, and code. Never cross-import.

## Templating decision
15 services and 10 industries render through **two reusable templates**, not
~165 bespoke pages. This is what makes the breadth maintainable.

## Sitemap (public)
Home / Services (4 clusters) / Industries (10) / Work / About / Pricing /
Resources (Blog, Guides, FAQ) / Contact / Quote / legal+utility.
Portal: Dashboard / Projects / Billing / Support / Documents / Settings.
No public page more than 3 clicks from Home.

## Navigation
- Sticky header: logo, primary nav, utility (search, login), persistent
  **Get a Quote** CTA.
- Mega menu: Services in 4 clusters (Web Dev, Commerce & Platforms, Specialized
  Sites, Growth & Support); Industries across 10 verticals.
- Breadcrumbs with schema.org BreadcrumbList on all but Home/hubs.
- Fat footer (4 cols) + CTA band + legal bar.
- Portal: left sidebar, minimal chrome (no mega menu/marketing footer).

## CTA strategy (layered)
Primary (Get a Quote — persistent), Secondary (Book a Consultation), Tertiary
(View Work / Download Guide), Micro (newsletter/chat). Every page ends in exactly
one primary CTA — no dead ends.
