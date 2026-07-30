import { Fragment } from 'react';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Container } from '@/components/layout/container';
import { TextReveal } from '@/components/motion/text-reveal';
import { ROUTES } from '@/config/routes';

export interface PageHeroCrumb {
  label: string;
  href: string;
}

export interface PageHeroProps {
  title: string;
  description?: string;
  /**
   * Trail entries AFTER Home, excluding the current page (rendered as the
   * non-linked final crumb). Omit entirely for top-level hub pages — the
   * real IA doc's own rule (despite the filename, found in
   * `06-client-dashboard.md`) is "breadcrumbs... on all but Home/hubs";
   * only genuinely nested pages (e.g. a blog post, `/about/process`) pass
   * this.
   */
  breadcrumbs?: PageHeroCrumb[];
}

/** Every interior marketing page's H1 (+ optional breadcrumb trail) — the one place
 * this pattern lives. Home uses `HomeHero` instead (a real hero, not a title band). */
function PageHero({ title, description, breadcrumbs }: PageHeroProps) {
  return (
    <section className="bg-glow-hero border-border border-b py-12 sm:py-16">
      <Container className="flex flex-col gap-4">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={ROUTES.marketing.home}>Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <Fragment key={crumb.href}>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <TextReveal
          as="h1"
          text={title}
          className="font-heading text-4xl font-medium tracking-tight sm:text-5xl"
        />
        {description ? (
          <p className="text-muted-foreground max-w-2xl text-lg">{description}</p>
        ) : null}
      </Container>
    </section>
  );
}

export { PageHero };
