'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { ChevronDownIcon, MenuIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { SPRING, STAGGER_DELAY } from '@/lib/animation/tokens';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Stagger } from '@/components/motion/stagger';
import { ROUTES } from '@/config/routes';
import { INDUSTRIES } from '@/content/industries';

const FLAT_LINKS: { label: string; href: string }[] = [
  { label: 'Work', href: ROUTES.marketing.work },
  { label: 'Pricing', href: ROUTES.marketing.pricing },
  { label: 'About', href: ROUTES.marketing.about },
  { label: 'Resources', href: ROUTES.marketing.resources },
  { label: 'Contact', href: ROUTES.marketing.contact },
];

/** Deliberately NOT `ServiceCluster`/`Service` from `content/services.ts` — those carry an
 * `icon: LucideIcon` (a function/component reference), which cannot cross the Server→Client
 * prop boundary (`MarketingNav` is `'use client'`). This mega menu never renders the icon
 * anyway — only name/slug — so the caller (`(marketing)/layout.tsx`, a Server Component) maps
 * down to this narrower, fully-serializable shape before passing it in. */
export interface NavServiceCluster {
  slug: string;
  name: string;
  services: { slug: string; name: string }[];
}

/**
 * Built on the existing `DropdownMenu` primitive (click-triggered, fully keyboard
 * accessible) rather than a new `NavigationMenu` primitive — functionally a mega menu
 * (a wide, grouped panel) without introducing a component the design system doesn't
 * already have. Matches the real IA doc's spec (despite the filename, found in
 * `06-client-dashboard.md`): "Mega menu: Services in 4 clusters... Industries across 10
 * verticals." Links point at the hub pages, not per-service/per-industry detail pages —
 * none exist yet.
 */
function ServicesMegaMenu({ serviceClusters }: { serviceClusters: NavServiceCluster[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          Services
          <ChevronDownIcon aria-hidden="true" className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="grid w-[calc(100vw-2rem)] max-w-[640px] grid-cols-2 gap-x-6 gap-y-1 p-4 sm:grid-cols-4"
      >
        {serviceClusters.map((cluster) => (
          <div key={cluster.slug} className="flex flex-col gap-0.5">
            <DropdownMenuLabel className="px-0">{cluster.name}</DropdownMenuLabel>
            {cluster.services.map((service) => (
              <DropdownMenuItem key={service.slug} asChild>
                <Link href={ROUTES.marketing.services}>{service.name}</Link>
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IndustriesMegaMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          Industries
          <ChevronDownIcon aria-hidden="true" className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="grid w-[calc(100vw-2rem)] max-w-[420px] grid-cols-2 gap-x-6 gap-y-1 p-4"
      >
        {INDUSTRIES.map((industry) => (
          <DropdownMenuItem key={industry.slug} asChild>
            <Link href={ROUTES.marketing.industries}>{industry.name}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Desktop nav — rendered into `Navbar`'s `nav` slot, `hidden lg:flex`. The active link gets
 * both a persistent highlight AND an animated `layoutId` underline that slides between links
 * on navigation. An earlier version of the underline broke click-through on the flat nav
 * links (Work/About/etc. stopped navigating) — the overlaid absolutely-positioned span was
 * very likely intercepting pointer events. The actual fix, not just caution: the decorative
 * span now has `pointer-events-none`, so it can never intercept a click regardless of exact
 * browser/paint-order behavior, while the highlight background stays as a non-motion
 * fallback so the active state is never solely dependent on the animation running. */
function MarketingNav({ serviceClusters }: { serviceClusters: NavServiceCluster[] }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <div className="hidden items-center gap-1 lg:flex">
      <ServicesMegaMenu serviceClusters={serviceClusters} />
      <IndustriesMegaMenu />
      {FLAT_LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <div key={link.href} className="relative">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className={cn(isActive && 'bg-muted text-foreground')}
            >
              <Link href={link.href} aria-current={isActive ? 'page' : undefined}>
                {link.label}
              </Link>
            </Button>
            {isActive ? (
              <motion.span
                aria-hidden="true"
                layoutId={reduceMotion ? undefined : 'nav-active-underline'}
                transition={{ type: 'spring', ...SPRING.snappy }}
                className="bg-accent pointer-events-none absolute inset-x-2.5 -bottom-0.5 h-0.5 rounded-full"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Mobile nav — a flat list (no nested mega-menu complexity below `lg`), `Drawer`-based
 * (vaul), same focus-trap/Esc-to-close guarantees as the portal's `MobileNav`. */
function MarketingMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <MenuIcon aria-hidden="true" className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">Navigation</DrawerTitle>
        <nav aria-label="Main navigation">
          <Stagger className="flex flex-col gap-1 p-4" staggerDelay={STAGGER_DELAY.tight}>
            <Link
              href={ROUTES.marketing.services}
              className="rounded-md px-2 py-2.5 text-sm font-medium hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Services
            </Link>
            <Link
              href={ROUTES.marketing.industries}
              className="rounded-md px-2 py-2.5 text-sm font-medium hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              Industries
            </Link>
            {FLAT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-2 py-2.5 text-sm font-medium hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Button asChild className="mt-2">
              <Link href={ROUTES.marketing.quote} onClick={() => setOpen(false)}>
                Get a Quote
              </Link>
            </Button>
          </Stagger>
        </nav>
      </DrawerContent>
    </Drawer>
  );
}

export { MarketingNav, MarketingMobileNav };
