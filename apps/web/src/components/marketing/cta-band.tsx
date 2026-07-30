import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layout/container';
import { Scale } from '@/components/motion/scale';
import { ROUTES } from '@/config/routes';

export interface CtaBandProps {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Optional secondary action, rendered next to the primary button — omitted entirely by
   * default so the ~10 existing call sites keep their current single-button rendering. */
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Optional small reassurance line under the buttons (e.g. "No obligation — just a scoped
   * quote"). Omitted by default. */
  reassurance?: string;
}

/**
 * The one primary-CTA band every marketing page ends in, per the real CTA strategy
 * (despite the filename, found in `06-client-dashboard.md`: "every page ends in exactly
 * one primary CTA — no dead ends"). Defaults to "Get a Quote" → `/quote`. `secondaryLabel`/
 * `secondaryHref`/`reassurance` are opt-in — most pages still render the lighter single-button
 * version; the homepage and `/work` use the fuller conversion treatment.
 */
function CtaBand({
  title,
  description,
  ctaLabel = 'Get a Quote',
  ctaHref = ROUTES.marketing.quote,
  secondaryLabel,
  secondaryHref,
  reassurance,
}: CtaBandProps) {
  return (
    <section className="bg-primary text-primary-foreground py-(--space-section-y) sm:py-(--space-section-y-lg)">
      <Container>
        <Scale inView from={0.95} className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-heading text-3xl font-medium tracking-tight sm:text-4xl">{title}</h2>
          {description ? (
            <p className="max-w-xl text-base opacity-90 sm:text-lg">{description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
            {secondaryLabel && secondaryHref ? (
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              >
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            ) : null}
          </div>
          {reassurance ? <p className="text-xs opacity-75">{reassurance}</p> : null}
        </Scale>
      </Container>
    </section>
  );
}

export { CtaBand };
