export interface TechCategory {
  label: string;
  description: string;
}

/**
 * Ordered group descriptions consumed by `TechStackStrip` — `label` matches the `category`
 * strings in content/tech-stack.ts exactly. Only 4 groups exist because only 10 real
 * technologies exist; no group is added purely to fill out a longer showcase (see
 * content/README.md's no-fabricated-content rule).
 */
export const TECH_CATEGORIES: TechCategory[] = [
  { label: 'Frontend', description: 'What visitors and users interact with directly.' },
  { label: 'Backend', description: 'The application and business-logic layer.' },
  { label: 'Database & Data', description: 'Where state lives, and how it stays fast.' },
  { label: 'DevOps & Infrastructure', description: 'How releases ship and run in production.' },
];
