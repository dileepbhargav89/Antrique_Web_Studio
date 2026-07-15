/**
 * sitemap.xml generation rules (Next.js `sitemap` convention).
 * Specification-level. Emits ONLY indexable marketing URLs with lastmod dates;
 * regenerated on content publish (ISR revalidate). NEVER includes portal,
 * wizard, thank-you, or filtered/paginated duplicate URLs.
 *
 * Sources dynamic URLs from the CMS/database at build/revalidate time:
 *   - static marketing pages (home, hubs, about, pricing, contact)
 *   - 15 service detail pages
 *   - 10 industry detail pages
 *   - published case studies
 *   - published blog posts
 *
 * If the map grows large, split into a sitemap index (per-section sitemaps).
 */

import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo/seo.config';

// changefreq/priority hints per section (guidance to crawlers)
export const SITEMAP_SECTIONS = {
  static: { priority: 0.8, changefreq: 'monthly' },
  service: { priority: 0.9, changefreq: 'monthly' }, // key SEO landing pages
  industry: { priority: 0.9, changefreq: 'monthly' },
  caseStudy: { priority: 0.7, changefreq: 'yearly' },
  blog: { priority: 0.6, changefreq: 'weekly' }, // freshest content
} as const;

/** Static marketing routes always present in the sitemap. */
export const STATIC_ROUTES = [
  '/',
  '/services',
  '/industries',
  '/work',
  '/pricing',
  '/about',
  '/about/process',
  '/blog',
  '/contact',
] as const;

/**
 * Sitemap entry shape. Dynamic entries (services, industries, case studies,
 * blog posts) are appended from the CMS with their real lastModified dates.
 */
export interface SitemapEntry {
  url: string; // absolute, canonical
  lastModified: string; // ISO date from content updated_at
  changeFrequency: string;
  priority: number;
}

/** Guard: a URL is sitemap-eligible only if indexable and not a duplicate. */
export const isSitemapEligible = (path: string): boolean => {
  const blocked = ['/portal', '/login', '/forgot-password', '/quote', '/thank-you', '/api'];
  if (blocked.some((b) => path.startsWith(b))) return false;
  if (path.includes('?')) return false; // no param/filtered duplicates
  return true;
};

export const SITE_ORIGIN = SITE.domain;

// Next.js file-convention entry point — required default export.
// Only static routes today; dynamic entries (services, industries, case
// studies, blog posts) are appended once the CMS/database exists (Sprint 2+).
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date().toISOString();
  return STATIC_ROUTES.filter(isSitemapEligible).map((path) => ({
    url: `${SITE_ORIGIN}${path}`,
    lastModified,
    changeFrequency: SITEMAP_SECTIONS.static.changefreq,
    priority: SITEMAP_SECTIONS.static.priority,
  }));
}
