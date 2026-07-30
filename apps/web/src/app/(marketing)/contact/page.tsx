import type { Metadata } from 'next';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';
import { ContactForm } from './contact-form';

export const metadata: Metadata = buildPageMetadata({
  title: 'Contact',
  description: "Tell us about your project — we'll get back to you within one business day.",
  path: ROUTES.marketing.contact,
});

/**
 * Deliberately no `localBusinessSchema` — that builder needs real NAP (name/address/
 * phone) data, which doesn't exist yet. Emitting it with fabricated address/phone would
 * misrepresent a real business location; see
 * `docs/architecture/marketing-site.md`'s Risks section.
 */
export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Contact', url: `${SITE.domain}${ROUTES.marketing.contact}` },
        ])}
      />
      <PageHero
        title="Contact Us"
        description="Tell us about your project — we'll get back to you within one business day."
      />
      <Container className="mx-auto max-w-xl py-16 sm:py-20">
        <ContactForm />
      </Container>
    </>
  );
}
