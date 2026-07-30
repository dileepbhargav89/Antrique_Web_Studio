import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { CaseStudyCard } from '@/components/marketing/case-study-card';
import { Reveal } from '@/components/motion/reveal';
import { Stagger } from '@/components/motion/stagger';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { HomeHero } from '@/components/marketing/home-hero';
import { IndustryCard } from '@/components/marketing/industry-card';
import { ProcessSteps } from '@/components/marketing/process-steps';
import { SectionHeading } from '@/components/marketing/section-heading';
import { ServiceCard } from '@/components/marketing/service-card';
import { StatStrip } from '@/components/marketing/stat-strip';
import { TechStackStrip } from '@/components/marketing/tech-stack-strip';
import { TestimonialsSection } from '@/components/marketing/testimonials-section';
import { TrustSection } from '@/components/marketing/trust-section';
import { ROUTES } from '@/config/routes';
import { ENGINEERING_STATS } from '@/content/engineering-stats';
import { INDUSTRIES } from '@/content/industries';
import { PROCESS_STEPS } from '@/content/process';
import { TECH_STACK } from '@/content/tech-stack';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { organizationSchema, websiteSchema } from '@/lib/seo/schema';
import { getCaseStudies } from '@/repositories/case-studies.repository';
import { getServiceClusters } from '@/repositories/services.repository';

export const metadata: Metadata = buildPageMetadata({
  title: 'Antrique Web Studio — Web Software, Made Predictable',
  description:
    'Secure, scalable, accessible web solutions for organizations across sectors. Custom sites, e-commerce, platforms, and ongoing support — backed by a productized delivery process.',
  path: ROUTES.marketing.home,
});

export default async function HomePage() {
  const [serviceClusters, caseStudies] = await Promise.all([
    getServiceClusters(),
    getCaseStudies(),
  ]);
  const featuredServices = serviceClusters.flatMap((cluster) => cluster.services).slice(0, 6);
  const featuredCaseStudies = caseStudies.slice(0, 3);

  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />

      <HomeHero />

      <TrustSection />

      <section className="py-(--space-section-y) sm:py-(--space-section-y-lg)">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="What we do"
            title="Fifteen services, four clusters, one delivery process"
            description="From a first landing page to a multi-tenant platform — the same rigor at every scale."
          />
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredServices.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </Stagger>
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href={ROUTES.marketing.services}>View All Services</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="bg-muted/40 relative overflow-hidden py-(--space-section-y) sm:py-(--space-section-y-lg)">
        {/* Cross-section lighting: a subtle static wash centered on the boundary with the
            next (plain-background) section, softening the hard `bg-muted/40` edge without
            adding an animated layer — static, so it's essentially free performance-wise. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 translate-y-1/2 bg-[radial-gradient(ellipse_at_center,var(--glow-accent)_0%,transparent_70%)]"
        />
        <Container className="relative flex flex-col gap-10">
          <SectionHeading
            eyebrow="Featured work"
            title="A glimpse at the range we design for"
            description="Antrique is early-stage — these are concept demonstrations, not real client engagements. Real case studies will appear here as our first projects launch."
          />
          <Stagger role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCaseStudies.map((caseStudy) => (
              <div key={caseStudy.slug} role="listitem">
                <CaseStudyCard caseStudy={caseStudy} />
              </div>
            ))}
          </Stagger>
          <div className="flex justify-center">
            <Button variant="outline" asChild>
              <Link href={ROUTES.marketing.work}>See All Concept Demos</Link>
            </Button>
          </div>
        </Container>
      </section>

      <TestimonialsSection />

      <section className="py-(--space-section-y) sm:py-(--space-section-y-lg)">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Who we work with"
            title="Built for organizations across sectors"
          />
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INDUSTRIES.map((industry) => (
              <IndustryCard key={industry.slug} industry={industry} />
            ))}
          </Stagger>
        </Container>
      </section>

      <section className="bg-muted/40 py-(--space-section-y) sm:py-(--space-section-y-lg)">
        <Container className="flex flex-col gap-10">
          <SectionHeading eyebrow="How we work" title="A transparent, seven-step process" />
          <Reveal className="mx-auto w-full max-w-2xl">
            <ProcessSteps steps={PROCESS_STEPS} />
          </Reveal>
        </Container>
      </section>

      <section className="py-(--space-section-y) sm:py-(--space-section-y-lg)">
        <Container className="flex flex-col items-center gap-8">
          <SectionHeading eyebrow="Technology" title="Built on a modern, production-grade stack" />
          <TechStackStrip items={TECH_STACK} />
        </Container>
      </section>

      <section className="bg-muted/40 relative overflow-hidden py-(--space-section-y) sm:py-(--space-section-y-lg)">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 translate-y-1/2 bg-[radial-gradient(ellipse_at_center,var(--glow-accent)_0%,transparent_70%)]"
        />
        <Container className="relative flex flex-col gap-10">
          <SectionHeading
            eyebrow="Engineering, not adjectives"
            title="Real numbers from the platform itself"
            description="We're pre-launch — instead of borrowed client logos, here's what we can actually verify about how we build."
          />
          <Reveal>
            <StatStrip stats={ENGINEERING_STATS} />
          </Reveal>
        </Container>
      </section>

      <CtaBand
        title="Ready to start your project?"
        description="Tell us what you're building — we'll follow up with a scoped quote, not a sales pitch."
        secondaryLabel="View Pricing"
        secondaryHref={ROUTES.marketing.pricing}
        reassurance="No obligation — just a scoped quote."
      />
    </>
  );
}
