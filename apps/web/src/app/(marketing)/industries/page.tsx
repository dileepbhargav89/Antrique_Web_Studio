import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';
import { Stagger } from '@/components/motion/stagger';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { IndustryCard } from '@/components/marketing/industry-card';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { INDUSTRIES } from '@/content/industries';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';

export const metadata: Metadata = buildPageMetadata({
  title: 'Industries',
  description:
    'Ten industries we build for — from education and healthcare to government and enterprise.',
  path: ROUTES.marketing.industries,
});

export default function IndustriesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Industries', url: `${SITE.domain}${ROUTES.marketing.industries}` },
        ])}
      />
      <PageHero
        title="Industries"
        description="Every sector has different constraints — compliance, procurement cycles, patient or student data. We build with those constraints in mind from day one, not as an afterthought."
      />
      <Container className="py-16 sm:py-20">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INDUSTRIES.map((industry) => (
            <IndustryCard key={industry.slug} industry={industry} />
          ))}
        </Stagger>
      </Container>
      <CtaBand
        title="Don't see your industry listed?"
        description="Get in touch — we're happy to talk through your specific requirements."
      />
    </>
  );
}
