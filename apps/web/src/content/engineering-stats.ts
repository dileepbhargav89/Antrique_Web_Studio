import type { LucideIcon } from 'lucide-react';
import {
  AccessibilityIcon,
  FlaskConicalIcon,
  LayersIcon,
  PercentIcon,
  ServerIcon,
  StarIcon,
} from 'lucide-react';

export interface EngineeringStat {
  label: string;
  value: string;
  icon?: LucideIcon;
}

/**
 * The first 4 entries are real, verifiable facts about the actual platform (see
 * docs/implementation/progress.md's Backend v1.0 Review Phase 5 entry for the source numbers),
 * used deliberately instead of fabricated client counts or revenue figures — Antrique is
 * pre-launch (see docs/product/01-discovery.md's Vision doc, real content despite the
 * filename), so there is no real client-facing traction to cite yet. Update these only when
 * the underlying facts change, not for marketing effect.
 *
 * The last 2 entries are explicitly labeled "(Demo)" in their own `label` — a pre-launch
 * studio has no real client-satisfaction survey or production-uptime history to report, so
 * these are illustrative values only, never presented as measured. No "Projects Completed" or
 * "Average Lighthouse Score" entry is included: a completed-projects count would read as a real
 * claim regardless of labeling, and no Lighthouse run exists this session to cite honestly —
 * see content/README.md's no-fabricated-content rule.
 */
export const ENGINEERING_STATS: EngineeringStat[] = [
  { label: 'Automated test suites', value: '160+', icon: FlaskConicalIcon },
  { label: 'Statement coverage', value: '85%+', icon: PercentIcon },
  { label: 'Accessibility baseline', value: 'WCAG 2.1 AA', icon: AccessibilityIcon },
  { label: 'Architecture', value: 'Multi-tenant, RLS-secured', icon: LayersIcon },
  { label: 'Client Satisfaction (Demo)', value: '4.9 / 5', icon: StarIcon },
  { label: 'Infrastructure Uptime (Demo)', value: '99.9%', icon: ServerIcon },
];
