import { Timeline } from '@/components/ui/timeline';
import type { ProcessStep } from '@/content/process';

export interface ProcessStepsProps {
  steps: ProcessStep[];
  className?: string;
}

/** Composes the existing `Timeline` primitive — no bespoke process-list markup. */
function ProcessSteps({ steps, className }: ProcessStepsProps) {
  return (
    <Timeline
      items={steps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
      }))}
      className={className}
    />
  );
}

export { ProcessSteps };
