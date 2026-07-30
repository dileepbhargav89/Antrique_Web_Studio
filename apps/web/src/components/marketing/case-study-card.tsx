import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CaseStudy } from '@/content/case-studies';

export interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

const ACCENT_VAR: Record<CaseStudy['accent'], string> = {
  1: 'var(--chart-1)',
  2: 'var(--chart-2)',
  3: 'var(--chart-3)',
  4: 'var(--chart-4)',
  5: 'var(--chart-5)',
};

/**
 * Renders one concept demo project. The "Concept Demo" badge sits in the mock browser-frame
 * chrome, always visible (not hover-only like `PortfolioPlaceholder`'s old "Demo Preview" —
 * the brief requires every project to be "clearly marked," not marked only on interaction).
 * Challenge/solution/outcomes disclose via a native `<details>` element rather than client-side
 * state — real keyboard/screen-reader semantics for free, and keeps this a server component.
 * The "screen" area is a small pure-CSS mock interface (nav strip + hero block + content
 * tiles, all plain divs, no text) rather than a flat icon-on-gradient block — reads as "a
 * webpage," not an empty card — built from one `--chart-*` token per card, cycled for variety.
 * No real screenshots or video: no image/video-fetching or -generation tool exists in this
 * environment (an established constraint from earlier phases).
 */
function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  const Icon = caseStudy.icon;
  const accent = ACCENT_VAR[caseStudy.accent];

  return (
    <div className="border-border bg-card flex h-full flex-col overflow-hidden rounded-xl border">
      <div className="border-border bg-muted/60 flex items-center justify-between gap-1.5 border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-destructive/40 size-2 rounded-full" />
          <span aria-hidden="true" className="bg-warning/50 size-2 rounded-full" />
          <span aria-hidden="true" className="bg-success/50 size-2 rounded-full" />
        </div>
        <Badge variant="outline" className="h-5 px-2 text-[0.65rem]">
          Concept Demo
        </Badge>
      </div>
      <div
        aria-hidden="true"
        className="relative flex aspect-[16/9] flex-col gap-2 overflow-hidden p-3"
        style={{
          backgroundImage: `linear-gradient(135deg, color-mix(in oklch, ${accent}, transparent 88%) 0%, color-mix(in oklch, ${accent}, transparent 96%) 100%)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <span className="bg-foreground/15 h-1.5 w-6 rounded-full" />
            <span className="bg-foreground/15 h-1.5 w-4 rounded-full" />
            <span className="bg-foreground/15 h-1.5 w-5 rounded-full" />
          </div>
          <span
            className="h-2.5 w-8 rounded-full"
            style={{ backgroundColor: accent, opacity: 0.5 }}
          />
        </div>
        <div className="bg-background/40 flex flex-1 items-center gap-3 rounded-lg p-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: `color-mix(in oklch, ${accent}, transparent 75%)` }}
          >
            <Icon aria-hidden="true" className="size-5" style={{ color: accent }} />
          </span>
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="bg-foreground/20 h-2 w-3/4 rounded-full" />
            <span className="bg-foreground/10 h-1.5 w-1/2 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <span className="bg-background/40 h-4 rounded-md" />
          <span className="bg-background/40 h-4 rounded-md" />
          <span className="bg-background/40 h-4 rounded-md" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {caseStudy.industry}
          </span>
          <h3 className="font-heading text-lg font-medium">{caseStudy.name}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {caseStudy.technologies.map((tech) => (
            <Badge key={tech} variant="secondary" className="text-xs">
              {tech}
            </Badge>
          ))}
        </div>
        <details className="group/details mt-auto">
          <summary className="text-accent flex cursor-pointer list-none items-center gap-1 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Challenge, solution & outcomes
            <ChevronDownIcon
              aria-hidden="true"
              className="size-3.5 transition-transform group-open/details:rotate-180"
            />
          </summary>
          <div className="flex flex-col gap-3 pt-3 text-sm">
            <div>
              <p className="text-foreground font-medium">Challenge</p>
              <p className="text-muted-foreground">{caseStudy.challenge}</p>
            </div>
            <div>
              <p className="text-foreground font-medium">Solution</p>
              <p className="text-muted-foreground">{caseStudy.solution}</p>
            </div>
            <div>
              <p className="text-foreground font-medium">Outcomes (illustrative example)</p>
              <ul className="flex flex-col gap-1">
                {caseStudy.outcomes.map((outcome) => (
                  <li key={outcome} className="text-muted-foreground flex items-start gap-1.5">
                    <CheckIcon
                      aria-hidden="true"
                      className="text-accent mt-0.5 size-3.5 shrink-0"
                    />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

export { CaseStudyCard };
