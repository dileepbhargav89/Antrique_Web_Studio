/**
 * robots.txt generation rules (Next.js `robots` convention).
 * Specification-level shape. Allows the indexable marketing site, disallows
 * the portal, wizard, thank-you, and internal/API routes to preserve crawl
 * budget, and points crawlers to the sitemap.
 *
 * Keep `disallow` in sync with NOINDEX_ROUTES in seo.config.ts.
 */

import { SITE } from "@/lib/seo/seo.config";

export const robotsRules = {
  rules: [
    {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/portal",          // entire authenticated surface
        "/login",
        "/forgot-password",
        "/quote",           // wizard steps (thin, transactional)
        "/thank-you",       // conversion confirmation
        "/api",             // internal routes
        "/*?*",             // block crawlable query-param duplicate URLs
      ],
    },
  ],
  sitemap: `${SITE.domain}/sitemap.xml`,
  host: SITE.domain,
} as const;
