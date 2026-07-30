import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layout/container';
import { Reveal } from '@/components/motion/reveal';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { SectionHeading } from '@/components/marketing/section-heading';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';

export const metadata: Metadata = buildPageMetadata({
  title: 'About',
  description:
    'Antrique Web Studio is building a platform-led, not project-led, web development practice — making commissioning and maintaining web software predictable.',
  path: ROUTES.marketing.about,
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: 'About', url: `${SITE.domain}${ROUTES.marketing.about}` }])}
      />
      <PageHero
        title="About Antrique"
        description="We're building a different kind of web studio — one where visibility, not just output, is the product."
      />

      <section className="py-16 sm:py-20">
        <Container className="mx-auto flex max-w-3xl flex-col gap-6">
          <Reveal>
            <SectionHeading align="left" as="h2" title="Our vision" />
          </Reveal>
          <p className="text-muted-foreground text-base sm:text-lg">
            Most dissatisfaction with a web project isn&rsquo;t about the quality of the work —
            it&rsquo;s about not knowing what&rsquo;s happening while it&rsquo;s being built. We
            want to become the most trusted end-to-end web development partner for organizations
            across sectors, by making commissioning and maintaining web software predictable,
            observable, and low-risk — platform-led, not project-led.
          </p>
          <SectionHeading align="left" as="h2" title="Our mission" />
          <p className="text-muted-foreground text-base sm:text-lg">
            We deliver secure, scalable, accessible web solutions by combining a productized
            delivery engine — reusable components, templates, and automation — with expert human
            oversight. That combination is what lowers time-to-launch and total cost of ownership
            without cutting corners.
          </p>
          <SectionHeading align="left" as="h2" title="Where we are today" />
          <p className="text-muted-foreground text-base sm:text-lg">
            Antrique is early-stage: we&rsquo;re building our client pipeline and onboarding our
            first engagements now. What you can already verify is the engineering discipline behind
            the platform itself — see our{' '}
            <Link href={ROUTES.marketing.aboutProcess} className="text-foreground underline">
              process
            </Link>{' '}
            and the technology choices on our{' '}
            <Link href={ROUTES.marketing.home} className="text-foreground underline">
              home page
            </Link>
            .
          </p>
          <div>
            <Button asChild>
              <Link href={ROUTES.marketing.aboutProcess}>See Our Process</Link>
            </Button>
          </div>
        </Container>
      </section>

      <CtaBand
        title="Want to work together?"
        description="We'd love to hear about what you're building."
      />
    </>
  );
}
