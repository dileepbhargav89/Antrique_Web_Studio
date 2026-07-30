import { TESTIMONIALS, type Testimonial } from '@/content/testimonials';

/**
 * Async on purpose — see `case-studies.repository.ts`'s comment for the full reasoning. No
 * testimonial concept exists anywhere in the backend. Every entry returned here is
 * demo/sample content (`isDemo: true`, "Sample Testimonial" badge in the UI) — see
 * `content/testimonials.ts`'s own header comment; this repository does not change that.
 */
export async function getTestimonials(): Promise<Testimonial[]> {
  return TESTIMONIALS;
}
