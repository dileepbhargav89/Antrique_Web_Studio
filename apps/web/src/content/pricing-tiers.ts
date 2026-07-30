export interface PricingTier {
  slug: string;
  name: string;
  tagline: string;
  bestFor: string;
  features: string[];
  featured?: boolean;
}

/**
 * Scope-differentiated tiers, deliberately with no fixed price figures —
 * no real pricing decision exists yet (not in any product doc), and every
 * page's primary CTA is "Get a Quote" per the real CTA strategy (despite
 * the filename, found in `06-client-dashboard.md`: "Primary (Get a Quote —
 * persistent)... every page ends in exactly one primary CTA"). Inventing
 * a number here would misrepresent a decision that hasn't been made.
 */
export const PRICING_TIERS: PricingTier[] = [
  {
    slug: 'essentials',
    name: 'Essentials',
    tagline: 'A focused, professional web presence.',
    bestFor: 'Best for SMEs, startups, and teams launching their first real site.',
    features: [
      'Custom-designed marketing site',
      'Mobile-first, accessible build',
      'Core on-page SEO setup',
      'Launch support',
    ],
  },
  {
    slug: 'growth',
    name: 'Growth',
    tagline: 'For teams that need more than a brochure site.',
    bestFor: 'Best for e-commerce, SaaS, and multi-stakeholder platforms.',
    features: [
      'Everything in Essentials',
      'Custom web application or storefront',
      'Third-party & payment integrations',
      'Ongoing maintenance retainer',
    ],
    featured: true,
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    tagline: 'For complex, multi-tenant, or compliance-sensitive builds.',
    bestFor: 'Best for government, healthcare, and large organizations.',
    features: [
      'Everything in Growth',
      'Multi-tenant, RLS-secured architecture',
      'Dedicated security & compliance review',
      'SLA-backed support',
    ],
  },
];
