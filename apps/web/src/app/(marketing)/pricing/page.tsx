import type { Metadata } from 'next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Container } from '@/components/layout/container';
import { Stagger } from '@/components/motion/stagger';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { PricingTierCard } from '@/components/marketing/pricing-tier-card';
import { SectionHeading } from '@/components/marketing/section-heading';
import { ROUTES } from '@/config/routes';
import { PRICING_TIERS } from '@/content/pricing-tiers';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, faqSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';
import { getFaqs } from '@/repositories/faqs.repository';

export const metadata: Metadata = buildPageMetadata({
  title: 'Pricing',
  description:
    'Scope-based pricing tiers, from a focused marketing site to a compliance-sensitive enterprise platform — every engagement starts with a scoped quote.',
  path: ROUTES.marketing.pricing,
});

const PRICING_FAQ_QUESTIONS = [
  'Do you offer fixed pricing?',
  'Do you offer ongoing maintenance after launch?',
];

export default async function PricingPage() {
  const faqs = await getFaqs();
  const pricingFaqs = faqs.filter((faq) => PRICING_FAQ_QUESTIONS.includes(faq.question));

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Pricing', url: `${SITE.domain}${ROUTES.marketing.pricing}` },
        ])}
      />
      <JsonLd data={faqSchema(pricingFaqs)} />
      <PageHero
        title="Pricing"
        description="Every engagement gets a scoped quote after a short discovery conversation — these tiers show what's typically included at each level of complexity, not a fixed price list."
      />
      <Container className="py-16 sm:py-20">
        <Stagger className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <PricingTierCard key={tier.slug} tier={tier} />
          ))}
        </Stagger>
      </Container>
      <section className="bg-muted/40 py-16 sm:py-20">
        <Container className="mx-auto flex max-w-2xl flex-col gap-8">
          <SectionHeading align="left" as="h2" title="Pricing questions" />
          <Accordion type="single" collapsible>
            {pricingFaqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Container>
      </section>
      <CtaBand
        title="Ready for a scoped quote?"
        description="Tell us about your project — we'll follow up with a tier and a real timeline."
      />
    </>
  );
}
