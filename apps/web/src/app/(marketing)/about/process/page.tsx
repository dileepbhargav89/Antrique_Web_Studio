import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ProcessSteps } from '@/components/marketing/process-steps';
import { ROUTES } from '@/config/routes';
import { PROCESS_STEPS } from '@/content/process';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';

export const metadata: Metadata = buildPageMetadata({
  title: 'Our Process',
  description:
    'A transparent, six-step delivery process — from discovery to launch and ongoing support.',
  path: ROUTES.marketing.aboutProcess,
});

export default function ProcessPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'About', url: `${SITE.domain}${ROUTES.marketing.about}` },
          { name: 'Our Process', url: `${SITE.domain}${ROUTES.marketing.aboutProcess}` },
        ])}
      />
      <PageHero
        title="Our Process"
        description="Two moments break most web projects: a chaotic start, and a silent middle. Our process is built specifically to avoid both."
        breadcrumbs={[
          { label: 'About', href: ROUTES.marketing.about },
          { label: 'Our Process', href: ROUTES.marketing.aboutProcess },
        ]}
      />
      <Container className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-2xl">
          <ProcessSteps steps={PROCESS_STEPS} />
        </div>
      </Container>
      <CtaBand
        title="Ready to get started?"
        description="Tell us about your project and we'll walk you through how this process applies to it."
      />
    </>
  );
}
