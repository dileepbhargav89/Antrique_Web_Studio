/**
 * Antrique Web Studio — SEO configuration & metadata contract.
 * Specification-level. No page logic; this defines the shape every route's
 * metadata must follow so titles, descriptions, canonicals, OG, and robots
 * directives are consistent across ~165 templated pages.
 */

// -- Site-wide constants ----------------------------------------------------
export const SITE = {
  name: "Antrique Web Studio",
  domain: "https://antrique.dev",       // canonical origin (non-www)
  titleTemplate: "%s — Antrique Web Studio",
  defaultTitle: "Antrique Web Studio — web software, made predictable",
  defaultDescription:
    "Secure, scalable, accessible web solutions for organizations across sectors. Custom sites, ecommerce, ERP, CRM, SaaS, SEO, and more.",
  locale: "en_IN",                      // India-first
  twitter: "@antrique",
  ogImageDefault: "/og/default.png",    // branded fallback share image
} as const;

/**
 * Metadata contract — every route exports an object of this shape.
 * `robots.index=false` on any page that must be reachable but not indexed
 * (quote wizard, thank-you, portal). Canonical is self-referencing by default.
 */
export interface RouteMeta {
  title: string;                 // page-specific; site name appended via template
  description: string;           // action-oriented, within length limits
  canonical: string;            // absolute URL; params stripped for filtered views
  robots: { index: boolean; follow: boolean };
  og: {
    type: "website" | "article";
    image: string;              // absolute or path; falls back to ogImageDefault
    imageAlt: string;
  };
  // Optional article fields (blog/case studies)
  article?: {
    publishedTime: string;
    modifiedTime: string;
    author: string;
    section: string;
  };
}

// -- Robots presets ---------------------------------------------------------
export const INDEXABLE = { index: true, follow: true } as const;
export const NOINDEX = { index: false, follow: true } as const;  // reachable, not indexed

/**
 * Routes that must NEVER be indexed (emit NOINDEX + excluded from sitemap +
 * disallowed in robots.txt). Keep this list in sync with robots + sitemap.
 */
export const NOINDEX_ROUTES = [
  "/quote",           // wizard steps — thin, transactional
  "/thank-you",       // conversion confirmation
  "/portal",          // entire authenticated surface
  "/login",
  "/forgot-password",
] as const;

/**
 * Title/description formulas per templated page type. Content is injected at
 * build/revalidate time from the CMS/database — never hard-coded per instance.
 */
export const TITLE_FORMULAS = {
  service:  (name: string) => `${name} Services`,
  industry: (sector: string) => `Web Development for ${sector}`,
  caseStudy:(client: string, title: string) => `${client}: ${title}`,
  blogPost: (title: string) => title,
} as const;
