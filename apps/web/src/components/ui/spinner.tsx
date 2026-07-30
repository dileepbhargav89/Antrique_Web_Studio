import { Loader2Icon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spin text-muted-foreground', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-8',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  label?: string;
}

function Spinner({ size, className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" data-slot="spinner">
      <Loader2Icon aria-hidden="true" className={cn(spinnerVariants({ size }), className)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export { Spinner };
