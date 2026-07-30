import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpenIcon, HelpCircleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/layout/container';
import { Hover } from '@/components/motion/hover';
import { Stagger } from '@/components/motion/stagger';
import { JsonLd } from '@/components/seo/json-ld';
import { PageHero } from '@/components/marketing/page-hero';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema } from '@/lib/seo/schema';
import { SITE } from '@/lib/seo/seo.config';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resources',
  description: 'Our blog and answers to common questions about working with Antrique.',
  path: ROUTES.marketing.resources,
});

const RESOURCE_LINKS = [
  {
    href: ROUTES.marketing.blog,
    title: 'Blog',
    description: 'Articles on performance, accessibility, and choosing a development partner.',
    icon: BookOpenIcon,
  },
  {
    href: ROUTES.marketing.faq,
    title: 'FAQ',
    description: 'Answers to the questions we hear most often.',
    icon: HelpCircleIcon,
  },
];

export default function ResourcesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Resources', url: `${SITE.domain}${ROUTES.marketing.resources}` },
        ])}
      />
      <PageHero
        title="Resources"
        description="Everything we've written down so you don't have to ask twice."
      />
      <Container className="py-16 sm:py-20">
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {RESOURCE_LINKS.map((resource) => {
            const Icon = resource.icon;
            return (
              <Hover key={resource.href} lift={4}>
                <Link href={resource.href}>
                  <Card className="h-full">
                    <CardHeader className="flex-row items-center gap-3 space-y-0">
                      <span className="bg-accent/10 text-accent flex size-10 shrink-0 items-center justify-center rounded-lg">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <CardTitle>{resource.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">{resource.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </Hover>
            );
          })}
        </Stagger>
      </Container>
    </>
  );
}
