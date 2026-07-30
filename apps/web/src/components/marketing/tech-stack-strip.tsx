import { Badge } from '@/components/ui/badge';
import { Stagger } from '@/components/motion/stagger';
import { STAGGER_DELAY } from '@/lib/animation/tokens';
import { TECH_CATEGORIES } from '@/content/tech-categories';
import type { TechItem } from '@/content/tech-stack';

export interface TechStackStripProps {
  items: TechItem[];
  className?: string;
}

const CHART_VARS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

/** Groups `items` by category (order + descriptions from `TECH_CATEGORIES`) instead of one
 * flat badge row — avoids "a random wall of badges." Groups with no matching items are
 * skipped rather than rendered empty. Each group heading gets a small `--chart-*` dot, cycled
 * by index (same decorative-token technique as `CaseStudyCard`'s accent) — a lightweight visual
 * anchor, not a new color system. `Stagger` wraps each direct child in its own `motion.div`
 * (only staggers direct children — nesting one `Stagger` per group, not one around the whole
 * thing, is what makes each group's chips cascade independently) and always renders a
 * `motion.div` root, not a real `<ul>` — `role="list"`/`role="listitem"` on plain `div`s
 * preserves list semantics for assistive tech without literal `<ul>`/`<li>` tags. */
function TechStackStrip({ items, className }: TechStackStripProps) {
  const groups = TECH_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category.label),
  })).filter((group) => group.items.length > 0);

  return (
    <div className={className ? className : 'flex w-full flex-col gap-8'}>
      {groups.map((group, index) => (
        <div key={group.category.label} className="flex flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="flex items-center gap-1.5 font-heading text-sm font-medium">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full"
                style={{ backgroundColor: CHART_VARS[index % CHART_VARS.length] }}
              />
              {group.category.label}
            </span>
            <span className="text-muted-foreground text-xs">{group.category.description}</span>
          </div>
          <Stagger
            role="list"
            staggerDelay={STAGGER_DELAY.tight}
            childDistance={8}
            className="flex flex-wrap justify-center gap-2"
          >
            {group.items.map((item) => (
              <div key={item.name} role="listitem">
                <Badge
                  variant="outline"
                  className="hover:border-accent hover:text-accent h-7 px-3 text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_0_16px_var(--glow-accent)]"
                >
                  {item.name}
                </Badge>
              </div>
            ))}
          </Stagger>
        </div>
      ))}
    </div>
  );
}

export { TechStackStrip };
