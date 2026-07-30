import Link from 'next/link';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hover } from '@/components/motion/hover';
import { ROUTES } from '@/config/routes';
import type { Service } from '@/content/services';

export interface ServiceCardProps {
  service: Service;
}

/**
 * "Learn more" points at the real `/services` hub page, not a fake per-service detail route —
 * none exist yet (Sprint 2's ×15 template build is future scope), matching this file's own
 * established "never a dead link" reasoning. The hover border is a genuine gradient border
 * (a 1px-padded wrapper with a gradient background revealed on hover, the `Card`'s own opaque
 * background covering everything but that 1px sliver) — not a `ring` utility standing in for
 * one, since the brief explicitly asked for an animated border, not just a ring color shift.
 */
function ServiceCard({ service }: ServiceCardProps) {
  const Icon = service.icon;

  return (
    <Hover lift={4}>
      <div className="group/service-card relative rounded-xl p-px">
        <div className="from-accent/0 to-accent/0 group-hover/service-card:from-accent/70 group-hover/service-card:to-accent/10 absolute inset-0 rounded-xl bg-gradient-to-br transition-colors duration-300" />
        <Card className="relative h-full transition-shadow duration-300 group-hover/service-card:shadow-[0_16px_32px_-12px_hsl(var(--shadow-color)/0.18),0_0_40px_var(--glow-accent-strong)]">
          <CardHeader className="gap-3">
            <span className="from-accent/20 to-accent/5 text-accent flex size-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover/service-card:rotate-6">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <CardTitle>{service.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">{service.description}</p>
            {service.features && service.features.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {service.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckIcon aria-hidden="true" className="text-accent size-3.5 shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {service.idealFor || (service.outcomes && service.outcomes.length > 0) ? (
              <div className="border-border/60 flex flex-col gap-2 border-t pt-3">
                {service.idealFor ? (
                  <p className="text-muted-foreground text-xs">
                    <span className="text-foreground font-medium">Ideal for:</span>{' '}
                    {service.idealFor}
                  </p>
                ) : null}
                {service.outcomes && service.outcomes.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {service.outcomes.map((outcome) => (
                      <li
                        key={outcome}
                        className="text-muted-foreground flex items-start gap-1.5 text-xs"
                      >
                        <ArrowRightIcon
                          aria-hidden="true"
                          className="text-accent mt-0.5 size-3 shrink-0"
                        />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <Link
              href={ROUTES.marketing.services}
              className="text-accent group/link mt-1 inline-flex items-center gap-1 text-sm font-medium"
            >
              Learn more
              <ArrowRightIcon
                aria-hidden="true"
                className="size-3.5 transition-transform group-hover/link:translate-x-0.5"
              />
            </Link>
          </CardContent>
        </Card>
      </div>
    </Hover>
  );
}

export { ServiceCard };
