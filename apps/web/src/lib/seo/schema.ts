/**
 * Antrique Web Studio — JSON-LD structured data catalog.
 * One builder per page type. Each returns a schema.org object that is
 * generated from the SAME structured content the page renders, so structured
 * data never drifts from what is visible (misleading schema is penalized).
 *
 * Specification-level: signatures + the exact schema shape, no rendering.
 */

import { SITE } from './seo.config';

/**
 * Home — Organization + WebSite.
 *
 * Deliberately omits `logo`/`sameAs` (Organization) and the sitelinks-search-box
 * `potentialAction` (WebSite) — confirmed during the Marketing Website Engineering
 * Review that none of `/logo.png`, real social profile URLs, or a `/search` route
 * actually exist. Declaring them would be schema pointing at 404s/nonexistent routes,
 * exactly the "misleading schema is penalized" risk this file's own header comment
 * warns about. Add them back once those real assets/routes exist, not before.
 */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.domain,
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: SITE.domain,
    name: SITE.name,
  };
}

/** Service detail — Service. Pair with faqSchema() for its FAQ block. */
export function serviceSchema(input: { name: string; description: string; url: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: input.url,
    provider: { '@type': 'Organization', name: SITE.name },
    areaServed: 'IN',
  };
}

/** FAQ block (service / industry / pricing) — wins expanded SERP real estate. */
export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/**
 * Blog post — BlogPosting (author + dates). `image` is optional — omitted when no real
 * image asset is available (see `organizationSchema()`'s comment on the same underlying
 * asset gap); `publisher.logo` is omitted for the same reason (no real `/logo.png`).
 */
export function blogPostingSchema(input: {
  title: string;
  description: string;
  url: string;
  image?: string;
  author: string;
  publishedTime: string;
  modifiedTime: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    ...(input.image ? { image: input.image } : {}),
    url: input.url,
    author: { '@type': 'Person', name: input.author },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
    },
    datePublished: input.publishedTime,
    dateModified: input.modifiedTime,
  };
}

/** Case study — CreativeWork. */
export function caseStudySchema(input: {
  name: string;
  description: string;
  url: string;
  image: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    creator: { '@type': 'Organization', name: SITE.name },
  };
}

/** Contact — LocalBusiness (consistent NAP for local SEO). */
export function localBusinessSchema(input: {
  phone: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: SITE.name,
    url: SITE.domain,
    telephone: input.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: input.street,
      addressLocality: input.city,
      addressRegion: input.region,
      postalCode: input.postalCode,
      addressCountry: input.country,
    },
  };
}

/** Breadcrumbs — on every page except Home and top-level hubs. */
export function breadcrumbSchema(trail: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

/**
 * Schema-per-page-type map — which builders each route emits.
 * (Reference table; enforced in the route metadata layer.)
 */
export const SCHEMA_BY_PAGE = {
  home: ['organizationSchema', 'websiteSchema'],
  service: ['serviceSchema', 'faqSchema', 'breadcrumbSchema'],
  industry: ['serviceSchema', 'faqSchema', 'breadcrumbSchema'],
  caseStudy: ['caseStudySchema', 'breadcrumbSchema'],
  blogPost: ['blogPostingSchema', 'breadcrumbSchema'],
  pricing: ['faqSchema', 'breadcrumbSchema'],
  contact: ['localBusinessSchema', 'breadcrumbSchema'],
} as const;
