import type { Metadata } from 'next';
import { SITE } from '@/lib/seo/seo.config';
import { appConfig } from './app';

/**
 * Title/description come from `lib/seo/seo.config.ts`'s `SITE` constant —
 * the authoritative, already-specified SEO contract (real content, canonical
 * origin, title template) — not duplicated here with a different template
 * format. `metadataBase` stays environment-driven (`appConfig.siteUrl`,
 * `NEXT_PUBLIC_SITE_URL`), since a staging deploy shouldn't claim the real
 * production origin as its own base URL the way `SITE.domain` (a fixed
 * literal) would.
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(appConfig.siteUrl),
  title: {
    default: SITE.defaultTitle,
    template: SITE.titleTemplate,
  },
  description: SITE.defaultDescription,
};
