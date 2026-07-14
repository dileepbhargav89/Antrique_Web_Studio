# SEO layer

Concrete SEO artifacts. All indexable metadata and structured data derive from
the same content the page renders, so they never drift.

- `seo.config.ts` — site constants, the RouteMeta contract, noindex routes, title formulas.
- `schema.ts` — JSON-LD builders per page type + the schema-per-page map.
- `../../app/robots.ts` — robots.txt rules (allow marketing, block portal/wizard).
- `../../app/sitemap.ts` — sitemap rules (indexable marketing URLs only).
- `../../../../config/lighthouserc.json` — Core Web Vitals + SEO budget, gates CI.

Consistency invariant (verified): every route in NOINDEX_ROUTES is also
robots-disallowed and excluded from the sitemap.
