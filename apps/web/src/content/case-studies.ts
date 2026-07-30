import type { LucideIcon } from 'lucide-react';
import {
  ArmchairIcon,
  BarChart3Icon,
  HardHatIcon,
  HomeIcon,
  ScaleIcon,
  SchoolIcon,
  StethoscopeIcon,
  UtensilsCrossedIcon,
} from 'lucide-react';

export interface CaseStudy {
  slug: string;
  name: string;
  industry: string;
  challenge: string;
  solution: string;
  /** Real, well-known technology names only — no invented tooling. Most entries reuse the
   * actual stack from content/tech-stack.ts; a couple (e.g. the Restaurant Platform's MERN
   * stack) intentionally use a different real stack to demonstrate range beyond Antrique's own
   * site — never presented as what this platform itself runs on. */
  technologies: string[];
  /** Illustrative, example-only outcome phrases — explicitly not real client metrics. Antrique
   * is pre-launch with no real project history to report (see content/README.md); every card
   * using these is labeled "Concept Demo" in the UI so this is never mistaken for a real
   * result. */
  outcomes: string[];
  icon: LucideIcon;
  /** Maps to `--chart-1`..`--chart-5` for per-card visual variety — cycles, doesn't invent a
   * new color per card. */
  accent: 1 | 2 | 3 | 4 | 5;
}

/**
 * 8 concept demo projects — NOT real clients or real engagements. Antrique is pre-launch (see
 * content/engineering-stats.ts's own comment); every entry here is a hypothetical brief built
 * to demonstrate range across industries and, in a couple of cases, across technology stacks
 * (see `technologies`'s own comment). Every render of this data must carry a visible
 * "Concept Demo" label — see `components/marketing/case-study-card.tsx`.
 */
export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'luxury-furniture-platform',
    name: 'Luxury Furniture Platform',
    industry: 'Furniture & Retail',
    challenge:
      'A boutique furniture brand needed an online storefront that felt as premium as their showroom, not a generic e-commerce template.',
    solution:
      'A custom storefront with a curated catalog, high-fidelity product presentation, and a checkout tuned for considered, higher-ticket purchases.',
    technologies: ['Next.js', 'React', 'PostgreSQL', 'Tailwind CSS'],
    outcomes: [
      'A catalog experience matching the in-showroom feel',
      'A checkout built for considered, high-ticket purchases',
    ],
    icon: ArmchairIcon,
    accent: 1,
  },
  {
    slug: 'healthcare-saas',
    name: 'Healthcare SaaS',
    industry: 'Healthcare',
    challenge:
      'A health-tech team needed a multi-tenant patient portal that could handle sensitive data without slowing down clinical staff.',
    solution:
      'A role-based, multi-tenant application with RLS-backed data isolation and an interface built for fast, low-friction daily use.',
    technologies: ['NestJS', 'PostgreSQL', 'Redis', 'React'],
    outcomes: [
      'Tenant data isolated by design, not convention',
      'A workflow clinical staff could use without extra training',
    ],
    icon: StethoscopeIcon,
    accent: 2,
  },
  {
    slug: 'school-erp',
    name: 'School ERP',
    industry: 'Education',
    challenge:
      'A growing school network was running admissions, attendance, and billing across disconnected spreadsheets.',
    solution:
      'A single institutional platform covering admissions, attendance, and billing, with role-based access for admins, teachers, and staff.',
    technologies: ['NestJS', 'PostgreSQL', 'Prisma', 'React'],
    outcomes: [
      'One system of record instead of five spreadsheets',
      'Role-based access matched to real school roles',
    ],
    icon: SchoolIcon,
    accent: 3,
  },
  {
    slug: 'construction-management-platform',
    name: 'Construction Management Platform',
    industry: 'Construction',
    challenge:
      'A construction firm needed real-time visibility into multiple job sites without relying on daily phone calls and paper logs.',
    solution:
      'A project-tracking platform with site-level progress logs, document sharing, and client-facing status portals.',
    technologies: ['Next.js', 'NestJS', 'PostgreSQL', 'Docker'],
    outcomes: [
      'Site progress visible in one place, not five phone calls',
      'Clients get a status portal instead of email chains',
    ],
    icon: HardHatIcon,
    accent: 4,
  },
  {
    slug: 'restaurant-platform',
    name: 'Restaurant Platform',
    industry: 'Hospitality',
    challenge:
      'A multi-location restaurant group needed online ordering and reservations that matched their brand, not a generic delivery-app skin.',
    solution:
      'A branded ordering and reservation experience with location-aware menus and real-time table availability, built on a MERN stack (MongoDB, Express, React, Node.js) for fast, document-driven menu updates across locations.',
    technologies: ['MongoDB', 'Express.js', 'React', 'Node.js'],
    outcomes: [
      'Ordering that feels like the brand, not a marketplace listing',
      'Real-time availability instead of overbooking',
    ],
    icon: UtensilsCrossedIcon,
    accent: 5,
  },
  {
    slug: 'finance-dashboard',
    name: 'Finance Dashboard',
    industry: 'Finance',
    challenge:
      'A finance team was manually assembling reports from multiple systems every week to track portfolio performance.',
    solution:
      'A unified analytics dashboard pulling data into one real-time view, with role-based access to sensitive financial data.',
    technologies: ['React', 'NestJS', 'PostgreSQL', 'Redis'],
    outcomes: [
      'Weekly manual reporting replaced by a live dashboard',
      'Sensitive data access scoped by role',
    ],
    icon: BarChart3Icon,
    accent: 1,
  },
  {
    slug: 'real-estate-crm',
    name: 'Real Estate CRM',
    industry: 'Real Estate',
    challenge:
      "A brokerage's agents were tracking leads and listings in personal spreadsheets, with no shared pipeline visibility.",
    solution:
      'A shared CRM connecting leads, listings, and follow-ups in one pipeline, with automated status tracking.',
    technologies: ['Next.js', 'NestJS', 'PostgreSQL', 'Prisma'],
    outcomes: [
      'One shared pipeline instead of a dozen spreadsheets',
      'Follow-ups tracked automatically, not by memory',
    ],
    icon: HomeIcon,
    accent: 2,
  },
  {
    slug: 'law-firm-website',
    name: 'Law Firm Website',
    industry: 'Legal',
    challenge:
      "A law firm's site read like a brochure from a decade ago and gave prospective clients no reason to reach out.",
    solution:
      'A credibility-first site with clear practice-area pages, attorney profiles, and a secure client intake form.',
    technologies: ['Next.js', 'Tailwind CSS', 'PostgreSQL'],
    outcomes: [
      'A site that reads as current, not dated',
      'A clear path from visitor to consultation request',
    ],
    icon: ScaleIcon,
    accent: 3,
  },
];
