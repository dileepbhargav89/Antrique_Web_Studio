import { Container } from '@/components/layout/container';
import { Stagger } from '@/components/motion/stagger';
import { getTestimonials } from '@/repositories/testimonials.repository';
import { SectionHeading } from './section-heading';
import { TestimonialCard } from './testimonial-card';

/** Mounted on the homepage after the case-study section — "here's what we built" followed by
 * "here's what that experience is like," before moving on to industries. Every entry is a
 * sample, not a real client quote — see content/testimonials.ts. Async: reads through
 * `repositories/testimonials.repository.ts`, not the content constant directly, so a future
 * real data source only requires a repository-level change. */
async function TestimonialsSection() {
  const testimonials = await getTestimonials();

  return (
    <section className="py-(--space-section-y) sm:py-(--space-section-y-lg)">
      <Container className="flex flex-col gap-10">
        <SectionHeading
          eyebrow="What clients could expect"
          title="Sample perspectives on the engagement experience"
          description="Antrique is pre-launch, so these are representative sample quotes, not real client testimonials — labeled clearly below."
        />
        <Stagger role="list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial) => (
            <div key={testimonial.author} role="listitem">
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}

export { TestimonialsSection };
