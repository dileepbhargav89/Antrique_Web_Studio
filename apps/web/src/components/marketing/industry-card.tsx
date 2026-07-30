import { ArrowRightIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hover } from '@/components/motion/hover';
import type { Industry } from '@/content/industries';

export interface IndustryCardProps {
  industry: Industry;
}

/** No detail pages exist yet for any industry — deliberately not a link, matching
 * `ServiceCard`'s same reasoning. Hover treatment (gradient border, glow, icon rotation)
 * mirrors `ServiceCard` exactly, for consistency between the two card types shown on the
 * same page — see that file's own comment for why the border is a real gradient wrapper,
 * not a `ring` utility. */
function IndustryCard({ industry }: IndustryCardProps) {
  const Icon = industry.icon;

  return (
    <Hover lift={4}>
      <div className="group/industry-card relative rounded-xl p-px">
        <div className="from-accent/0 to-accent/0 group-hover/industry-card:from-accent/70 group-hover/industry-card:to-accent/10 absolute inset-0 rounded-xl bg-gradient-to-br transition-colors duration-300" />
        <Card className="relative h-full transition-shadow duration-300 group-hover/industry-card:shadow-[0_16px_32px_-12px_hsl(var(--shadow-color)/0.18),0_0_40px_var(--glow-accent-strong)]">
          <CardHeader className="flex-row items-center gap-3 space-y-0">
            <span className="from-accent/20 to-accent/5 text-accent flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br transition-transform duration-300 group-hover/industry-card:rotate-6">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <CardTitle>{industry.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">{industry.description}</p>
            {industry.focusAreas && industry.focusAreas.length > 0 ? (
              <ul className="border-border/60 flex flex-col gap-1 border-t pt-3">
                {industry.focusAreas.map((area) => (
                  <li key={area} className="text-muted-foreground flex items-start gap-1.5 text-xs">
                    <ArrowRightIcon
                      aria-hidden="true"
                      className="text-accent mt-0.5 size-3 shrink-0"
                    />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Hover>
  );
}

export { IndustryCard };
