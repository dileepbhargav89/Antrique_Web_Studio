import { Hover } from '@/components/motion/hover';
import { Stagger } from '@/components/motion/stagger';
import { Container } from '@/components/layout/container';
import { SectionHeading } from './section-heading';
import { TRUST_PILLARS } from '@/content/trust-pillars';

/**
 * Mounted directly below `HomeHero` — the first real content the visitor reads after the
 * headline, so it has to earn trust fast. Six pillars, each a real fact or capability claim
 * (see content/trust-pillars.ts), presented as visual cards rather than a plain bullet list.
 * Reuses `ServiceCard`'s established icon-badge/gradient language at a lighter weight (no
 * gradient-border hover, no glow) since these cards aren't links — matching `IndustryCard`'s
 * same "no fake link target" reasoning.
 */
function TrustSection() {
  return (
    <section className="py-(--space-section-y) sm:py-(--space-section-y-lg)">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="Why Antrique"
          title="Six commitments behind every engagement"
          description="Not marketing copy bolted on afterward — the same standards that shape how this site itself was built."
        />
        <Stagger role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} role="listitem">
                <Hover lift={2}>
                  <div className="border-border bg-card flex h-full flex-col gap-3 rounded-xl border p-6 transition-shadow duration-300 hover:shadow-[0_12px_24px_-10px_hsl(var(--shadow-color)/0.16)]">
                    <span className="from-accent/20 to-accent/5 text-accent flex size-10 items-center justify-center rounded-lg bg-gradient-to-br">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="font-heading text-base font-medium">{pillar.title}</h3>
                    <p className="text-muted-foreground text-sm">{pillar.description}</p>
                  </div>
                </Hover>
              </div>
            );
          })}
        </Stagger>
      </Container>
    </section>
  );
}

export { TrustSection };
