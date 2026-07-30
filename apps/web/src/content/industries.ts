import type { LucideIcon } from 'lucide-react';
import {
  GraduationCapIcon,
  StoreIcon,
  RocketIcon,
  LandmarkIcon,
  HeartPulseIcon,
  Building2Icon,
  HandHeartIcon,
  BuildingIcon,
  PlaneTakeoffIcon,
  BriefcaseIcon,
} from 'lucide-react';

export interface Industry {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** 2-3 short, honest statements of how we adapt software for this sector — real approach
   * claims, not fabricated project history. Optional so future industries aren't forced to
   * backfill one. */
  focusAreas?: string[];
}

/**
 * 10 industries — derived from the personas listed in the real Product
 * Discovery content (found, despite the filename, in
 * `02-information-architecture.md`/`03-feature-design.md`: "School Admin,
 * SME Owner, Startup Founder, Govt Procurement, Hospital IT, Enterprise
 * Marketing Lead"), extended to a reasonable 10 to match the docs' own
 * "10 industries" figure. No detail pages exist yet for any of these —
 * `IndustryCard` links conceptually, not to a real route.
 */
export const INDUSTRIES: Industry[] = [
  {
    slug: 'education',
    name: 'Education',
    description: 'Schools, institutions, and ed-tech platforms.',
    icon: GraduationCapIcon,
    focusAreas: [
      'Cohort- and course-structured platforms',
      'Institution-ready access control',
      'Accessible for diverse learners',
    ],
  },
  {
    slug: 'sme-retail',
    name: 'SME & Retail',
    description: 'Small and mid-size businesses selling online and offline.',
    icon: StoreIcon,
    focusAreas: [
      'Storefronts that work online and in-store',
      'Inventory-aware catalog management',
      'Fast, budget-conscious builds',
    ],
  },
  {
    slug: 'startups-technology',
    name: 'Startups & Technology',
    description: 'Early-stage teams that need to move fast without cutting corners.',
    icon: RocketIcon,
    focusAreas: [
      'Architecture that scales without a rebuild',
      'Multi-tenant SaaS foundations',
      'Fast iteration without cut corners',
    ],
  },
  {
    slug: 'government-public-sector',
    name: 'Government & Public Sector',
    description: 'Compliance-conscious public-facing digital services.',
    icon: LandmarkIcon,
    focusAreas: [
      'WCAG 2.1 AA accessibility as a baseline',
      'Compliance-conscious data handling',
      'Public-facing clarity and transparency',
    ],
  },
  {
    slug: 'healthcare',
    name: 'Healthcare',
    description: 'Providers and health-tech platforms handling sensitive data.',
    icon: HeartPulseIcon,
    focusAreas: [
      'Careful handling of sensitive patient data',
      'Patient-facing accessibility by default',
      'Integration-ready architecture',
    ],
  },
  {
    slug: 'enterprise-corporate',
    name: 'Enterprise & Corporate',
    description: 'Larger organizations with multiple stakeholders and systems.',
    icon: Building2Icon,
    focusAreas: [
      'Multi-stakeholder approval workflows',
      'Role-based access across teams',
      'Integration with existing internal systems',
    ],
  },
  {
    slug: 'nonprofits-ngos',
    name: 'Non-Profits & NGOs',
    description: 'Mission-driven organizations focused on impact and trust.',
    icon: HandHeartIcon,
    focusAreas: [
      'Donation flows built to convert, not confuse',
      'Transparent, accessible impact reporting',
      'Budget-conscious delivery',
    ],
  },
  {
    slug: 'real-estate-construction',
    name: 'Real Estate & Construction',
    description: 'Listings, project showcases, and client-facing portals.',
    icon: BuildingIcon,
    focusAreas: [
      'Listing- and portfolio-heavy layouts',
      'Client-facing project portals',
      'Media-rich pages that still load fast',
    ],
  },
  {
    slug: 'hospitality-travel',
    name: 'Hospitality & Travel',
    description: 'Bookings, itineraries, and guest-facing experiences.',
    icon: PlaneTakeoffIcon,
    focusAreas: [
      'Booking- and itinerary-driven flows',
      'Guest-facing experiences across devices',
      'Peak-load-aware performance',
    ],
  },
  {
    slug: 'professional-services',
    name: 'Professional Services',
    description: 'Legal, financial, and consulting practices.',
    icon: BriefcaseIcon,
    focusAreas: [
      'Credibility-first, content-led design',
      'Secure client intake and document flows',
      'Clear service and consultation pathways',
    ],
  },
];
