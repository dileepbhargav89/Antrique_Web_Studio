import type { LucideIcon } from 'lucide-react';
import {
  AccessibilityIcon,
  BotIcon,
  CloudIcon,
  GaugeIcon,
  LayersIcon,
  ShieldCheckIcon,
} from 'lucide-react';

export interface TrustPillar {
  title: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Six commitments behind every engagement — each grounded in a real, already-established fact
 * (the actual stack, the real 160+/85%+ test numbers, the WCAG 2.1 AA baseline already claimed
 * in content/engineering-stats.ts) or a capability/approach claim, never a fabricated usage
 * stat. Matches this project's standing no-invented-content convention.
 */
export const TRUST_PILLARS: TrustPillar[] = [
  {
    title: 'Modern Engineering Stack',
    description: 'Next.js, React, and TypeScript — the same stack this site itself runs on.',
    icon: LayersIcon,
  },
  {
    title: 'Engineering Rigor',
    description: '160+ automated test suites and 85%+ statement coverage back every release.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Performance-First',
    description:
      'Core Web Vitals and load budgets are reviewed during delivery, not bolted on after launch.',
    icon: GaugeIcon,
  },
  {
    title: 'Accessibility by Default',
    description: 'WCAG 2.1 AA is the baseline for every build we ship, not an optional add-on.',
    icon: AccessibilityIcon,
  },
  {
    title: 'AI-Ready Integration',
    description:
      'Architected so AI-assisted features can be added to your product later without a rebuild.',
    icon: BotIcon,
  },
  {
    title: 'Cloud & DevOps Expertise',
    description: 'Containerized deployments and CI/CD pipelines make releases routine, not risky.',
    icon: CloudIcon,
  },
];
