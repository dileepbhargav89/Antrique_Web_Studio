import type { LucideIcon } from 'lucide-react';
import {
  AppWindowIcon,
  DatabaseIcon,
  LayoutTemplateIcon,
  RefreshCwIcon,
  ShoppingCartIcon,
  StoreIcon,
  RepeatIcon,
  CreditCardIcon,
  SparklesIcon,
  UserRoundIcon,
  GraduationCapIcon,
  HandHeartIcon,
  SearchIcon,
  WrenchIcon,
  ShieldCheckIcon,
} from 'lucide-react';

export interface Service {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** 3 short, honest capability bullets — real claims about what the service includes, not
   * fabricated results/numbers. Optional so future services aren't forced to backfill one. */
  features?: string[];
  /** One sentence describing who this service actually fits — helps a visitor self-select
   * without reading every bullet. Optional, same reasoning as `features`. */
  idealFor?: string;
  /** 1-2 qualitative outcome phrases — what changes for the client, not a fabricated metric
   * (e.g. no invented "40% faster" claims for a pre-launch studio with no real project history
   * — see content/README.md). Optional. */
  outcomes?: string[];
}

export interface ServiceCluster {
  slug: string;
  name: string;
  description: string;
  services: Service[];
}

/**
 * 15 services across 4 clusters — matches the cluster names in
 * docs/product's real Information Architecture content (found, despite the
 * filename, in `06-client-dashboard.md`: "Mega menu: Services in 4
 * clusters (Web Dev, Commerce & Platforms, Specialized Sites, Growth &
 * Support)"). Individual service names within each cluster aren't
 * enumerated anywhere in the docs — derived reasonably here. No detail
 * pages exist yet for any of these (Sprint 2's ×15 template build is
 * future scope) — `ServiceCard` links conceptually, not to a real route.
 */
export const SERVICE_CLUSTERS: ServiceCluster[] = [
  {
    slug: 'web-development',
    name: 'Web Development',
    description: 'Custom-built sites and applications, engineered for the long run.',
    services: [
      {
        slug: 'custom-website-design',
        name: 'Custom Website Design',
        description: 'A site designed around your brand and your customers, not a template.',
        icon: LayoutTemplateIcon,
        features: [
          'Brand-aligned visual design',
          'Fully responsive layouts',
          'SEO-ready structure',
        ],
        idealFor:
          "Businesses that need a distinct online presence but don't have an in-house design team.",
        outcomes: [
          'A site that reflects your brand, not a template',
          'Content structure built for real editors',
        ],
      },
      {
        slug: 'web-application-development',
        name: 'Web Application Development',
        description: 'Full-stack applications built for real workflows, not just pages.',
        icon: AppWindowIcon,
        features: [
          'Full-stack architecture',
          'Real-time data workflows',
          'Scalable multi-tenant design',
        ],
        idealFor:
          'Teams replacing spreadsheets or fragile scripts with a real, maintainable application.',
        outcomes: ['A system built around your actual workflow', 'Room to grow without a rebuild'],
      },
      {
        slug: 'cms-development',
        name: 'CMS Development',
        description: 'Content your team can manage independently, without touching code.',
        icon: DatabaseIcon,
        features: [
          'No-code content editing',
          'Role-based publishing',
          'Structured content modeling',
        ],
        idealFor: 'Marketing and content teams who need to publish without waiting on a developer.',
        outcomes: ['Editors work independently, safely', 'Structured content ready for reuse'],
      },
      {
        slug: 'website-modernization',
        name: 'Website Redesign & Modernization',
        description: 'Bring an aging site up to modern performance and design standards.',
        icon: RefreshCwIcon,
        features: [
          'Performance re-audit',
          'Modern accessibility standards',
          'Incremental, low-risk rollout',
        ],
        idealFor:
          'Organizations running a site that still works, but no longer performs or looks the part.',
        outcomes: ['Faster load times, modern accessibility', 'A staged rollout with no downtime'],
      },
    ],
  },
  {
    slug: 'commerce-platforms',
    name: 'Commerce & Platforms',
    description: 'Transactional platforms built to handle real revenue safely.',
    services: [
      {
        slug: 'ecommerce-development',
        name: 'E-Commerce Development',
        description: 'Storefronts that convert, from catalog to checkout.',
        icon: ShoppingCartIcon,
        features: [
          'Conversion-focused checkout',
          'Inventory-aware catalog',
          'Hosted payment integration',
        ],
        idealFor: 'Brands ready to sell online without gluing together disconnected tools.',
        outcomes: [
          'A checkout built to convert, not just function',
          'Inventory and catalog that stay in sync',
        ],
      },
      {
        slug: 'marketplace-platforms',
        name: 'Marketplace Platforms',
        description: 'Multi-vendor platforms connecting buyers and sellers at scale.',
        icon: StoreIcon,
        features: [
          'Multi-vendor storefronts',
          'Commission & payout logic',
          'Vendor onboarding flows',
        ],
        idealFor:
          'Founders building a platform that connects two sides of a market, not a single storefront.',
        outcomes: [
          'Vendors onboard without hand-holding',
          'Payouts and commissions handled correctly from day one',
        ],
      },
      {
        slug: 'subscription-saas-platforms',
        name: 'Subscription & SaaS Platforms',
        description: 'Recurring-revenue products with billing, plans, and tenancy built in.',
        icon: RepeatIcon,
        features: [
          'Recurring billing built in',
          'Plan & usage management',
          'Multi-tenant from day one',
        ],
        idealFor:
          'Teams launching a recurring-revenue product that needs real multi-tenancy, not a workaround.',
        outcomes: [
          'Billing and plans that scale with usage',
          'Tenant isolation built in from the start',
        ],
      },
      {
        slug: 'payment-integration',
        name: 'Payment Integration',
        description: 'Hosted-gateway payment flows — we never touch raw card data.',
        icon: CreditCardIcon,
        features: [
          'Hosted-gateway checkout',
          'Minimized PCI scope',
          'Reconciliation-ready records',
        ],
        idealFor: 'Any team that needs to accept payments without taking on card-data liability.',
        outcomes: [
          'PCI scope minimized by design',
          'Records that reconcile cleanly with your books',
        ],
      },
    ],
  },
  {
    slug: 'specialized-sites',
    name: 'Specialized Sites',
    description: 'Purpose-built experiences for specific audiences and goals.',
    services: [
      {
        slug: 'landing-pages-microsites',
        name: 'Landing Pages & Microsites',
        description: 'Focused, fast-loading pages built around one conversion goal.',
        icon: SparklesIcon,
        features: [
          'Single-goal page structure',
          'Fast, lightweight builds',
          'A/B-test-ready markup',
        ],
        idealFor: 'Campaigns and launches that need one page to do one job, fast.',
        outcomes: [
          'A page built around a single conversion goal',
          'Ready for A/B testing from day one',
        ],
      },
      {
        slug: 'portfolio-personal-sites',
        name: 'Portfolio & Personal Sites',
        description: 'A polished presence for individuals, consultants, and creators.',
        icon: UserRoundIcon,
        features: ['Content-first layouts', 'Easy self-publishing', 'Fast, minimal footprint'],
        idealFor:
          'Consultants, creators, and specialists who need a credible presence they can update themselves.',
        outcomes: ['A fast, content-first site', 'Easy to keep current without a developer'],
      },
      {
        slug: 'educational-platforms',
        name: 'Educational Platforms',
        description: 'Course, cohort, and institutional sites built for real classrooms.',
        icon: GraduationCapIcon,
        features: [
          'Cohort & course structure',
          'Progress tracking',
          'Institution-ready access control',
        ],
        idealFor: 'Schools, cohort programs, and course creators running real classrooms online.',
        outcomes: [
          'Structured cohorts and progress tracking',
          'Access control that matches institutional needs',
        ],
      },
      {
        slug: 'nonprofit-ngo-sites',
        name: 'Non-Profit & NGO Sites',
        description: 'Mission-first sites focused on donations, outreach, and trust.',
        icon: HandHeartIcon,
        features: ['Donation-first flows', 'Transparent impact reporting', 'Accessible by default'],
        idealFor: 'Mission-driven organizations that need donor trust and accessible outreach.',
        outcomes: [
          "A donation flow that doesn't lose supporters",
          'Transparent, accessible impact reporting',
        ],
      },
    ],
  },
  {
    slug: 'growth-support',
    name: 'Growth & Support',
    description: 'Keeping what we build fast, secure, and found.',
    services: [
      {
        slug: 'seo-content-strategy',
        name: 'SEO & Content Strategy',
        description: 'Technical SEO and content that compound instead of decaying.',
        icon: SearchIcon,
        features: [
          'Technical SEO audits',
          'Structured content planning',
          'Ongoing performance tracking',
        ],
        idealFor: "Teams whose site is live but isn't being found.",
        outcomes: [
          'Technical issues found and fixed',
          'Content that compounds instead of decaying',
        ],
      },
      {
        slug: 'website-maintenance-support',
        name: 'Website Maintenance & Support',
        description: 'Ongoing updates, monitoring, and support after launch.',
        icon: WrenchIcon,
        features: ['Proactive monitoring', 'Regular dependency updates', 'Direct support access'],
        idealFor: 'Teams that shipped a site and now need it to stay secure and current.',
        outcomes: [
          'Fewer surprises from outdated dependencies',
          'A direct line to support when something breaks',
        ],
      },
      {
        slug: 'performance-security-audits',
        name: 'Performance & Security Audits',
        description: 'A structured review of speed, accessibility, and hardening.',
        icon: ShieldCheckIcon,
        features: [
          'Core Web Vitals review',
          'Accessibility conformance check',
          'Security hardening report',
        ],
        idealFor: 'Teams who need an honest, structured read on where their site actually stands.',
        outcomes: [
          'A prioritized list of real issues, not guesses',
          'A clear baseline to measure future work against',
        ],
      },
    ],
  },
];
