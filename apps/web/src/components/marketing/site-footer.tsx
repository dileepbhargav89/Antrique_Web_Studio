import Link from 'next/link';
import { Footer } from '@/components/layout/footer';
import { NewsletterForm } from './newsletter-form';
import { appConfig } from '@/config/app';
import { ROUTES } from '@/config/routes';
import type { ServiceCluster } from '@/content/services';
import { TECH_STACK } from '@/content/tech-stack';

export interface SiteFooterProps {
  serviceClusters: ServiceCluster[];
}

function buildFooterColumns(serviceClusters: ServiceCluster[]) {
  return [
    {
      heading: 'Company',
      links: [
        { label: 'About', href: ROUTES.marketing.about },
        { label: 'Our Process', href: ROUTES.marketing.aboutProcess },
        { label: 'Work', href: ROUTES.marketing.work },
        { label: 'Blog', href: ROUTES.marketing.blog },
      ],
    },
    {
      heading: 'Services',
      links: serviceClusters.map((cluster) => ({
        label: cluster.name,
        href: ROUTES.marketing.services,
      })),
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Pricing', href: ROUTES.marketing.pricing },
        { label: 'FAQ', href: ROUTES.marketing.faq },
        { label: 'Resources', href: ROUTES.marketing.resources },
      ],
    },
    {
      heading: 'Contact',
      links: [
        { label: 'Get in Touch', href: ROUTES.marketing.contact },
        { label: 'Request a Quote', href: ROUTES.marketing.quote },
        { label: 'Industries We Serve', href: ROUTES.marketing.industries },
      ],
    },
  ];
}

/**
 * The real "fat footer (4 cols) + CTA band + legal bar" from the IA doc (despite the
 * filename, found in `06-client-dashboard.md`). Composed into the existing `Footer`
 * shell's `start` slot (a single rich node, not fighting that shell's own two-slot
 * layout) — `mx-auto max-w-screen-xl` here (not the `Container` component) to avoid
 * doubling up on `Footer`'s own horizontal padding.
 *
 * Technologies is rendered as plain, non-linking labels (not another `Link` column like the
 * others) — there's no per-technology page to send a visitor to, and turning each name into a
 * dead-end link would be worse than not linking at all (see `ServiceCard`'s own "never a dead
 * link" reasoning). No "Social" column — there are no real social accounts to link yet;
 * omitted rather than pointed at placeholder URLs. The newsletter signup (`NewsletterForm`)
 * submits to a real, validated Route Handler (`app/api/newsletter/route.ts`) — honestly
 * placeholder server-side (logs, doesn't persist, no ESP wired) rather than a disabled UI
 * pretending nothing's there — same pattern as the Contact page's form.
 */
function SiteFooter({ serviceClusters }: SiteFooterProps) {
  const footerColumns = buildFooterColumns(serviceClusters);

  return (
    <Footer
      start={
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-10 py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
            <div className="col-span-2 flex flex-col gap-2 sm:col-span-3 lg:col-span-1">
              <span className="font-heading text-lg font-medium">{appConfig.name}</span>
              <p className="text-muted-foreground text-sm">{appConfig.description}</p>
            </div>
            {footerColumns.map((column) => (
              <div key={column.heading} className="flex flex-col gap-2">
                <span className="text-sm font-medium">{column.heading}</span>
                <ul className="flex flex-col gap-1.5">
                  {column.links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Technologies</span>
              <ul className="flex flex-col gap-1.5">
                {TECH_STACK.map((tech) => (
                  <li key={tech.name} className="text-muted-foreground text-sm">
                    {tech.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-border flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">Stay updated</span>
              <p className="text-muted-foreground text-xs">
                Occasional notes on new work and capabilities.
              </p>
            </div>
            <NewsletterForm />
          </div>

          <div className="border-border flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              &copy; {new Date().getFullYear()} {appConfig.name}. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link
                href={ROUTES.marketing.privacy}
                className="text-muted-foreground hover:text-foreground"
              >
                Privacy Policy
              </Link>
              <Link
                href={ROUTES.marketing.terms}
                className="text-muted-foreground hover:text-foreground"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      }
    />
  );
}

export { SiteFooter };
