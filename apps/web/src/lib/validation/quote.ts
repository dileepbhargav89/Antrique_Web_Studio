import { z } from 'zod';

const PROJECT_TYPE_VALUES = [
  'web-development',
  'commerce-platforms',
  'specialized-sites',
  'growth-support',
  'not-sure',
] as const;

const BUDGET_TIER_VALUES = ['essentials', 'growth', 'enterprise', 'not-sure'] as const;

const TIMELINE_VALUES = ['asap', '1-3-months', '3-6-months', 'flexible'] as const;

export const PROJECT_TYPES: { value: (typeof PROJECT_TYPE_VALUES)[number]; label: string }[] = [
  { value: 'web-development', label: 'Web Development' },
  { value: 'commerce-platforms', label: 'Commerce & Platforms' },
  { value: 'specialized-sites', label: 'Specialized Sites' },
  { value: 'growth-support', label: 'Growth & Support' },
  { value: 'not-sure', label: "I'm not sure yet" },
];

export const BUDGET_TIERS: { value: (typeof BUDGET_TIER_VALUES)[number]; label: string }[] = [
  { value: 'essentials', label: 'Essentials' },
  { value: 'growth', label: 'Growth' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'not-sure', label: "I'm not sure yet" },
];

export const TIMELINES: { value: (typeof TIMELINE_VALUES)[number]; label: string }[] = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1-3-months', label: '1–3 months' },
  { value: '3-6-months', label: '3–6 months' },
  { value: 'flexible', label: 'Flexible' },
];

/** Shared between `quote/quote-wizard.tsx` (client validation) and
 * `app/api/quote/route.ts` (server validation). */
export const quoteFormSchema = z.object({
  projectType: z.enum(PROJECT_TYPE_VALUES),
  budgetTier: z.enum(BUDGET_TIER_VALUES),
  timeline: z.enum(TIMELINE_VALUES),
  details: z.string().min(10, 'Tell us a bit more about the project (at least 10 characters).'),
  name: z.string().min(2, 'Enter your full name.'),
  email: z.email('Enter a valid email address.'),
  company: z.string().optional(),
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

export interface QuoteStep {
  id: string;
  title: string;
  fields: (keyof QuoteFormValues)[];
}

/**
 * One question per screen, contact captured last — the real spec (despite the
 * filename, found in `05-admin-dashboard.md`): "One question per screen, visible
 * progress... contact captured last... never auto-submitted."
 */
export const QUOTE_STEPS: QuoteStep[] = [
  { id: 'projectType', title: 'What are you looking to build?', fields: ['projectType'] },
  { id: 'budgetTier', title: "What's your budget range?", fields: ['budgetTier'] },
  { id: 'timeline', title: "What's your timeline?", fields: ['timeline'] },
  { id: 'details', title: 'Tell us more about the project', fields: ['details'] },
  { id: 'contact', title: 'How can we reach you?', fields: ['name', 'email', 'company'] },
];
