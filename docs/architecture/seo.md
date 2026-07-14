# SEO Architecture

SEO is a system property, not an add-on — top of the Discovery north-star funnel.
Implemented in `apps/web/src/lib/seo/` + `apps/web/src/app/{robots,sitemap}.ts` +
`config/lighthouserc.json`.

## Core split
Marketing site is engineered to be INDEXED (SSG/ISR, full HTML, structured data).
Portal + wizard + thank-you are engineered to be EXCLUDED (noindex + robots-blocked
+ never in sitemap). Verified invariant: every noindex route is robots-disallowed
and sitemap-excluded.

## Concerns
- **Technical:** SSG/ISR HTML on first byte, clean ≤3-level URLs, one H1, semantic
  landmarks, deliberate internal linking, www/trailing-slash canonicalization.
- **Metadata (dynamic):** unique title/description per page, generated from content
  for templated pages. noindex on thin/private pages.
- **Schema:** Organization+WebSite (home), Service+FAQPage (service/industry),
  BlogPosting (blog), CreativeWork (case study), LocalBusiness (contact),
  BreadcrumbList (all). Generated from rendered content — never drifts.
- **OpenGraph/Twitter:** every page; purpose-built share images for blog/case
  studies, branded fallback.
- **Sitemap:** auto-generated, indexable marketing URLs only, lastmod, split if
  large. **Robots:** allow marketing, disallow portal/wizard/api, point to sitemap.
- **Canonical:** self-referencing; filtered views canonicalize to base. Redirect
  manager preserves equity (301s).
- **Performance/CWV:** LCP≤2.5s, CLS≤0.1, INP≤200ms. RUM in field, Lighthouse
  budget gates CI.
- **Image SEO:** modern formats, responsive, alt required, descriptive filenames.
- **Blog SEO:** Article schema, author/dates, TOC, internal links to services,
  paginated-archive canonicalization.
- **Local SEO:** LocalBusiness + consistent NAP, sector+geo terms.
- **Accessibility as SEO:** semantic HTML/alt/headings serve both; a procurement
  proof point for gov/edu/health.
- **Measurement:** Search Console + privacy-first analytics + RUM, tied back to
  quote-start conversion.
