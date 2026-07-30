import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { CaseStudyCard } from '@/components/marketing/case-study-card';
import { Stagger } from '@/components/motion/stagger';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';
import { getCaseStudies } from '@/repositories/case-studies.repository';

export const metadata: Metadata = buildPageMetadata({
  title: 'Work',
  description:
    'Concept demo case studies across eight industries, showing the range of software Antrique builds — real engagements will appear here as our first clients launch.',
  path: ROUTES.marketing.work,
});

/**
 * Deliberately does not repeat the service-cluster cards or process timeline — both
 * already live on Home, Services, and About/Process. Duplicating them here just to fill
 * the page failed the review's "no duplicated content" check; this page's real job is
 * the honest capabilities/case-studies framing below, so that's the only content it owns.
 */
export default async function WorkPage() {
  const caseStudies = await getCaseStudies();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: 'Work', url: `${SITE.domain}${ROUTES.marketing.work}` }])}
      />
      <PageHero
        title="Our Work"
        description="Antrique is early-stage — these are concept demonstrations, not real client work, showing the range of software we build across industries. Real case studies will appear here as our first engagements launch."
      />

      <section className="py-16 sm:py-20">
        <Container className="flex flex-col gap-10">
          <Stagger role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((caseStudy) => (
              <div key={caseStudy.slug} role="listitem">
                <CaseStudyCard caseStudy={caseStudy} />
              </div>
            ))}
          </Stagger>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="outline" asChild>
              <Link href={ROUTES.marketing.services}>See What We Build</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={ROUTES.marketing.aboutProcess}>See How We Work</Link>
            </Button>
          </div>
        </Container>
      </section>

      <CtaBand
        title="Want to be one of our first case studies?"
        description="Tell us about your project — early engagements get our closest attention."
        secondaryLabel="Ask a Question"
        secondaryHref={ROUTES.marketing.contact}
        reassurance="No obligation — just a conversation."
      />
    </>
  );
}
