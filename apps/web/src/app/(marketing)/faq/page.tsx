import type { Metadata } from 'next';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Container } from '@/components/layout/container';
import { JsonLd } from '@/components/seo/json-ld';
import { CtaBand } from '@/components/marketing/cta-band';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, faqSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';
import { getFaqs } from '@/repositories/faqs.repository';

export const metadata: Metadata = buildPageMetadata({
  title: 'FAQ',
  description: 'Answers to the questions we hear most often about working with Antrique.',
  path: ROUTES.marketing.faq,
});

export default async function FaqPage() {
  const faqs = await getFaqs();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: 'FAQ', url: `${SITE.domain}${ROUTES.marketing.faq}` }])}
      />
      <JsonLd data={faqSchema(faqs)} />
      <PageHero title="Frequently Asked Questions" />
      <Container className="mx-auto max-w-2xl py-16 sm:py-20">
        <Accordion type="single" collapsible>
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
      <CtaBand
        title="Still have questions?"
        description="Get in touch and we'll answer directly."
        ctaLabel="Contact Us"
        ctaHref={ROUTES.marketing.contact}
      />
    </>
  );
}
