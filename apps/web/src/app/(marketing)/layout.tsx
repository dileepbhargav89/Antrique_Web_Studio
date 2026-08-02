import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/branding/Logo';
import { Wordmark } from '@/components/branding/Wordmark';
import { MarketingMobileNav, MarketingNav } from '@/components/marketing/site-nav';
import { ScrollProgressBar } from '@/components/marketing/scroll-progress-bar';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SupportWidget } from '@/components/marketing/support-widget';
import { appConfig } from '@/config/app';
import { defaultMetadata } from '@/config/metadata';
import { ROUTES } from '@/config/routes';
import { getServiceClusters } from '@/repositories/services.repository';

export const metadata: Metadata = defaultMetadata;

/**
 * Real marketing chrome — mega-menu nav, persistent "Get a Quote" CTA, mobile drawer,
 * and the fat footer. See `docs/architecture/marketing-site.md` for the full site
 * structure this wraps. `serviceClusters` is fetched once here (through the repository, not
 * `content/services.ts` directly) and threaded down to `MarketingNav` and `SiteFooter` —
 * both render on every marketing page, so fetching once here beats each doing its own
 * (duplicate) fetch. `MarketingNav` is a Client Component (interactive dropdowns), so it
 * can't `await` the repository itself — it also can't receive the full `ServiceCluster[]`
 * as a prop (each `Service.icon` is a function/component reference, and functions can't
 * cross a Server→Client prop boundary), so it gets mapped down to `NavServiceCluster[]`
 * (name/slug only) first. `SiteFooter` stays a Server Component, so it gets the full data.
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const serviceClusters = await getServiceClusters();
  const navServiceClusters = serviceClusters.map((cluster) => ({
    slug: cluster.slug,
    name: cluster.name,
    services: cluster.services.map((service) => ({ slug: service.slug, name: service.name })),
  }));

  return (
    <>
      <ScrollProgressBar />
      <Navbar
        brand={
          <Link
            href={ROUTES.marketing.home}
            aria-label={`${appConfig.name} — Home`}
            className="group flex items-center gap-2.5 rounded-lg transition-transform duration-300 ease-out hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Logo className="transition-[filter] duration-300 ease-out group-hover:drop-shadow-[0_0_8px_var(--accent)]" />
            <Wordmark />
          </Link>
        }
        nav={<MarketingNav serviceClusters={navServiceClusters} />}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" asChild className="hidden sm:inline-flex">
              <Link href={ROUTES.marketing.quote}>Get a Quote</Link>
            </Button>
            <MarketingMobileNav />
          </div>
        }
      />
      <main id="main-content">{children}</main>
      <SiteFooter serviceClusters={serviceClusters} />
      <SupportWidget />
    </>
  );
}
