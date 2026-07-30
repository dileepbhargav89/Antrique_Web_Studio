import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { QuoteWizard } from './quote-wizard';

/** NOINDEX — already reserved in `lib/seo/seo.config.ts`'s `NOINDEX_ROUTES` ("wizard
 * steps — thin, transactional") and `robots.ts`'s disallow list. */
export const metadata: Metadata = buildPageMetadata({
  title: 'Get a Quote',
  description: 'Tell us about your project and get a scoped quote.',
  path: ROUTES.marketing.quote,
  noindex: true,
});

export default function QuotePage() {
  return (
    <>
      <PageHero
        title="Get a Quote"
        description="Five short questions — no sales call required to get a real answer."
      />
      <Container className="mx-auto max-w-xl py-16 sm:py-20">
        <QuoteWizard />
      </Container>
    </>
  );
}
