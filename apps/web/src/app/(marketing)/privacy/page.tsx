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
  title: 'Privacy Policy',
  description: 'How Antrique Web Studio collects, uses, and protects your information.',
  path: ROUTES.marketing.privacy,
});

const LAST_UPDATED = '2026-07-26';

export default function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Privacy Policy', url: `${SITE.domain}${ROUTES.marketing.privacy}` },
        ])}
      />
      <PageHero title="Privacy Policy" description={`Last updated ${LAST_UPDATED}`} />
      <Container className="mx-auto flex max-w-2xl flex-col gap-8 py-16 sm:py-20">
        <p className="text-muted-foreground text-sm italic">
          This policy is a general-purpose template covering how this site is intended to handle
          data. It has not been reviewed by legal counsel and should be before the site handles real
          personal data at scale.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">1. Introduction</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            This Privacy Policy explains how {SITE.name} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) collects, uses, and protects information when you visit {SITE.domain}{' '}
            or otherwise interact with us — for example, by submitting a contact or quote request
            form.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">2. Information We Collect</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We collect information you voluntarily provide through our Contact and Get a Quote forms
            — your name, email address, company (optional), and any project details you share. We do
            not require an account to browse this site, and we never ask for payment card details on
            this site: any real payment, once available, is handled entirely by a hosted payment
            gateway, not by us directly.
          </p>
          <p className="text-muted-foreground text-sm sm:text-base">
            We may also collect standard technical information automatically — such as browser type,
            device type, and pages visited — via privacy-respecting analytics, only if and when
            analytics is enabled for this deployment.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">3. How We Use Information</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We use the information you provide to respond to your inquiry, prepare a quote, and,
            where you&rsquo;ve consented, contact you about our services. We do not sell your
            personal information to third parties.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">4. Cookies</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            This site uses a minimal set of cookies required for it to function — for example, a
            session cookie used only by the authenticated client portal, not this marketing site.
            Where analytics is enabled, an analytics cookie may also be set. We do not use
            third-party advertising cookies.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">5. Data Sharing &amp; Third Parties</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We do not share your personal information with third parties except where necessary to
            provide our services (for example, a hosted payment gateway for an active client
            engagement) or where required by law.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">6. Data Security</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We apply reasonable technical and organizational safeguards to protect information you
            share with us, including tenant-isolated data storage for any client-facing systems we
            operate. No method of transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">7. Data Retention</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We retain contact and quote request information only as long as reasonably necessary to
            respond to your inquiry or, if you become a client, for the duration of our engagement
            and as required by applicable law.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">8. Your Rights</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Depending on your location, you may have the right to access, correct, or request
            deletion of your personal information. To exercise these rights, contact us using the
            details below.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">9. Children&rsquo;s Privacy</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            This site is not directed at children, and we do not knowingly collect personal
            information from children.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">10. Changes to This Policy</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the
            top of this page reflects the most recent revision.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-medium">11. Contact</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Questions about this policy can be sent through our{' '}
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
