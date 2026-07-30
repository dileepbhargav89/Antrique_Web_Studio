export interface TechItem {
  name: string;
  category: string;
}

/**
 * The real stack this monorepo actually runs — not a generic "we use
 * modern tech" list. See docs/architecture/architecture.md /
 * docs/architecture/frontend.md for the real source of truth this mirrors.
 * `category` values match content/tech-categories.ts's group labels exactly
 * (4 groups — Frontend/Backend/Database & Data/DevOps & Infrastructure —
 * not a wider set, since inventing extra groups just to fill out a longer
 * list would misrepresent a 10-item real stack).
 */
export const TECH_STACK: TechItem[] = [
  { name: 'Next.js', category: 'Frontend' },
  { name: 'React', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'Tailwind CSS', category: 'Frontend' },
  { name: 'NestJS', category: 'Backend' },
  { name: 'PostgreSQL', category: 'Database & Data' },
  { name: 'Prisma', category: 'Database & Data' },
  { name: 'Redis', category: 'Database & Data' },
  { name: 'Docker', category: 'DevOps & Infrastructure' },
  { name: 'GitHub Actions', category: 'DevOps & Infrastructure' },
];
