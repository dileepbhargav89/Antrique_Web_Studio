export interface ProcessStep {
  id: string;
  title: string;
  description: string;
}

/**
 * Matches the customer journey in the real Product Discovery content
 * (despite the filename, found in `02-information-architecture.md`):
 * "Awareness → Consideration → Onboarding → Delivery → Launch →
 * Retention," with onboarding/requirement-chaos and delivery-silence
 * named as the two make-or-break moments — reflected in Discovery's and
 * Development's own descriptions below. A dedicated "Strategy" step sits
 * between Discovery and Design (the brief's own named client-journey flow)
 * — discovery findings need to become a concrete, signed-off plan before
 * design work starts, not skip straight from "what we learned" to
 * "what it looks like."
 */
export const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'discovery',
    title: 'Discovery',
    description:
      'We map goals, users, and constraints before writing a line of code — the step most projects skip, and the one that causes the most rework later.',
  },
  {
    id: 'strategy',
    title: 'Strategy',
    description:
      "Discovery findings become a concrete plan — scope, technical approach, and milestones you sign off on before development starts, so there's no ambiguity about what's being built.",
  },
  {
    id: 'design',
    title: 'Design',
    description:
      'Wireframes and visual design reviewed with you at every stage, not revealed as a surprise at the end.',
  },
  {
    id: 'development',
    title: 'Development',
    description:
      'Built in visible increments with staging previews, so you always know exactly where things stand.',
  },
  {
    id: 'testing-qa',
    title: 'Testing & QA',
    description:
      'Functional, accessibility, and performance checks before anything reaches production.',
  },
  {
    id: 'launch',
    title: 'Launch',
    description: 'A planned go-live with a clear handover, not a silent deployment.',
  },
  {
    id: 'support',
    title: 'Support & Growth',
    description:
      'Ongoing maintenance and improvement after launch — the relationship doesn’t end at go-live.',
  },
];
