import type { Metadata } from 'next';
import { INDEXABLE, NOINDEX, SITE, type RouteMeta } from './seo.config';

export interface PageMetaInput {
  title: string;
  description: string;
  /** e.g. `/services` — combined with `SITE.domain` for the canonical/OG URL. */
  path: string;
  noindex?: boolean;
  ogType?: RouteMeta['og']['type'];
  ogImage?: string;
  ogImageAlt?: string;
  article?: RouteMeta['article'];
}

/**
 * Maps the already-specified `RouteMeta` contract (`seo.config.ts`) to a
 * real Next.js `Metadata` object — the bridge that spec-level file's own
 * header comment describes ("every route exports an object of this
 * shape") but that hadn't been implemented until this phase. Every
 * marketing page's `generateMetadata`/`metadata` export goes through this,
 * so canonical/OG/robots/Twitter stay consistent across ~15 pages instead
 * of each page hand-rolling its own `Metadata` object.
 *
 * `ogImage` is deliberately NOT defaulted to `SITE.ogImageDefault` — that
 * path (`/og/default.png`) has no real file behind it yet (`public/og/`
 * doesn't exist; confirmed, not assumed, during the Marketing Website
 * Engineering Review). Emitting a confidently-declared Open Graph/Twitter
 * image that 404s is worse for real link-unfurling than omitting the
 * field entirely, so this only includes `images` when a caller passes a
 * real `ogImage`. See `docs/architecture/marketing-site.md`'s Risks
 * section — a real branded share image is a pre-launch asset gap, not
 * something this phase can fabricate.
 */
export function buildPageMetadata(input: PageMetaInput): Metadata {
  const canonical = `${SITE.domain}${input.path}`;
  const robots = input.noindex ? NOINDEX : INDEXABLE;
  const ogImageAlt = input.ogImageAlt ?? input.title;
  const images = input.ogImage ? [{ url: input.ogImage, alt: ogImageAlt }] : undefined;

  const baseOg = {
    title: input.title,
    description: input.description,
    url: canonical,
    siteName: SITE.name,
    locale: SITE.locale,
    ...(images ? { images } : {}),
  };

  const openGraph: Metadata['openGraph'] = input.article
    ? {
        ...baseOg,
        type: 'article',
        publishedTime: input.article.publishedTime,
        modifiedTime: input.article.modifiedTime,
        authors: [input.article.author],
        section: input.article.section,
      }
    : {
        ...baseOg,
        type: input.ogType === 'article' ? 'website' : (input.ogType ?? 'website'),
      };

  return {
    title: input.title,
    description: input.description,
    alternates: { canonical },
    robots: { index: robots.index, follow: robots.follow },
    openGraph,
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      site: SITE.twitter,
      title: input.title,
      description: input.description,
      ...(input.ogImage ? { images: [input.ogImage] } : {}),
    },
  };
}
