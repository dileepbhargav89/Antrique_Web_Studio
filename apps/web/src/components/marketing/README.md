# components/marketing

Marketing-domain compositions built from `components/ui/*` — no duplicate
primitives. See `docs/architecture/marketing-site.md` for the full site
architecture.

- `home-hero.tsx` / `hero-scene.tsx` — the one bespoke hero (Home only);
  every interior page uses `page-hero.tsx` instead.
- `section-heading.tsx` — the one section-title pattern (eyebrow + scroll-
  reveal heading + description).
- `service-card.tsx` / `industry-card.tsx` — deliberately not links; no
  detail pages exist yet for any service/industry.
- `process-steps.tsx` — wraps the existing `Timeline` primitive.
- `stat-strip.tsx` — wraps the existing `StatsCard` primitive.
- `tech-stack-strip.tsx`, `pricing-tier-card.tsx`, `blog-card.tsx`,
  `cta-band.tsx` — content-specific compositions over `Card`/`Badge`/
  `Button`.
- `site-nav.tsx` — `MarketingNav` (desktop mega menu, built on the existing
  `DropdownMenu` primitive, not a new `NavigationMenu`) + `MarketingMobileNav`
  (Drawer-based, flat list).
- `site-footer.tsx` — the fat 4-column footer + legal bar, composed into
  the existing `Footer` shell's `start` slot.
