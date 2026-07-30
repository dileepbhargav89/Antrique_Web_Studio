import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';
import { Stagger } from '@/components/motion/stagger';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { SectionHeading } from '@/components/marketing/section-heading';
import { ServiceCard } from '@/components/marketing/service-card';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';
import { getServiceClusters } from '@/repositories/services.repository';

export const metadata: Metadata = buildPageMetadata({
  title: 'Services',
  description:
    'Fifteen services across four clusters — web development, commerce & platforms, specialized sites, and growth & support.',
  path: ROUTES.marketing.services,
});

export default async function ServicesPage() {
  const serviceClusters = await getServiceClusters();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Services', url: `${SITE.domain}${ROUTES.marketing.services}` },
        ])}
      />
      <PageHero
        title="Services"
        description="Fifteen services, organized into four clusters — the same delivery rigor whether you need a landing page or a multi-tenant platform. Detail pages for each service are on the way; get in touch and we'll walk you through the right fit today."
      />
      <div className="flex flex-col gap-16 py-16 sm:py-20">
        {serviceClusters.map((cluster) => (
          <Container key={cluster.slug} className="flex flex-col gap-8">
            <SectionHeading
              align="left"
              as="h2"
              title={cluster.name}
              description={cluster.description}
            />
            <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cluster.services.map((service) => (
                <ServiceCard key={service.slug} service={service} />
              ))}
            </Stagger>
          </Container>
        ))}
      </div>
      <CtaBand
        title="Not sure which service you need?"
        description="Tell us about your project and we'll recommend the right scope."
      />
    </>
  );
}
