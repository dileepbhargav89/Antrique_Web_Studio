export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  /** Always true today — kept as an explicit field, not inferred, so a future real testimonial
   * can't accidentally render without deliberately setting this to false. */
  isDemo: true;
}

/**
 * Sample testimonials — NOT real clients or real quotes. Antrique is pre-launch (see
 * content/README.md's standing no-fabricated-content rule: "no real clients, testimonials,
 * case studies... exist yet"). Every attribution here is a generic role at an obviously-demo
 * company name (never resembling a real, identifiable organization), and every render of this
 * data must carry a visible "Sample Testimonial" badge — see
 * `components/marketing/testimonial-card.tsx`. Quotes describe the engagement *experience*
 * (process, communication, rigor), not measurable outcomes — avoids the same fabricated-metric
 * risk already reasoned through for content/case-studies.ts.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Every stage was visible — we always knew exactly where the project stood, and nothing showed up as a surprise at handover.',
    author: 'Operations Lead',
    role: 'Demo Retail Co.',
    isDemo: true,
  },
  {
    quote:
      'They asked harder questions about our data model than we did. The architecture held up exactly the way it was scoped to.',
    author: 'Founder',
    role: 'Sample Fintech Startup',
    isDemo: true,
  },
  {
    quote:
      "Accessibility wasn't an afterthought bolted on before launch — it shaped decisions from the first design review.",
    author: 'Marketing Director',
    role: 'Example Healthcare Group',
    isDemo: true,
  },
  {
    quote:
      'The discovery process alone was worth it — it turned a vague idea into a plan we could actually execute against.',
    author: 'Program Manager',
    role: 'Concept Nonprofit Alliance',
    isDemo: true,
  },
];
