import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service',
  description: 'The terms governing use of the Antrique Web Studio website and services.',
  path: ROUTES.marketing.terms,
});

const LAST_UPDATED = '2026-07-26';

export default function TermsOfServicePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Terms of Service', url: `${SITE.domain}${ROUTES.marketing.terms}` },
        ])}
      />
      <PageHero title="Terms of Service" description={`Last updated ${LAST_UPDATED}`} />
      <Container className="mx-auto flex max-w-2xl flex-col gap-8 py-16 sm:py-20">
        <p className="text-muted-foreground text-sm italic">
          These terms are a general-purpose template. They have not been reviewed by legal counsel
          and should be before entering into real client engagements at scale.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            By accessing {SITE.domain} or submitting a quote or contact request, you agree to these
            Terms of Service. If you do not agree, please do not use this site.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">2. Description of Services</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {SITE.name} provides custom web design, development, and related digital services.
            Details, scope, and pricing for any specific engagement are agreed separately and in
            writing before work begins — nothing on this website constitutes a binding offer or
            contract on its own.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">3. Quotes &amp; Engagements</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Submitting a quote request does not create any obligation on either party. A binding
            engagement begins only once both parties agree to a written scope of work, timeline, and
            price.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">4. Intellectual Property</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Unless otherwise agreed in a signed statement of work, ownership of deliverables created
            for a client transfers to that client upon full payment.
            {SITE.name} retains ownership of its own pre-existing tools, frameworks, and reusable
            components used to build those deliverables.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">5. Payments</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Where payments apply to a real engagement, they are processed through a hosted
            third-party payment gateway. We do not collect or store raw payment card details
            ourselves.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">6. Acceptable Use</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            You agree not to misuse this website — including attempting to gain unauthorized access
            to any system, submitting fraudulent or abusive form content, or interfering with the
            site&rsquo;s normal operation.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">7. Limitation of Liability</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            This website and its content are provided &ldquo;as is&rdquo; without warranties of any
            kind. To the fullest extent permitted by law, {SITE.name} is not liable for any
            indirect, incidental, or consequential damages arising from your use of this site.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">8. Termination</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We may suspend or restrict access to this website at any time, for any reason, without
            notice.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">9. Governing Law</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            These terms are governed by the laws of India, without regard to conflict-of- law
            principles.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">10. Changes to These Terms</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We may update these terms from time to time. The &ldquo;Last updated&rdquo; date at the
            top of this page reflects the most recent revision.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">11. Contact</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Questions about these terms can be sent through our{' '}
            <Link href={ROUTES.marketing.contact} className="text-foreground underline">
              Contact page
            </Link>
            .
          </p>
        </section>
      </Container>
    </>
  );
}
