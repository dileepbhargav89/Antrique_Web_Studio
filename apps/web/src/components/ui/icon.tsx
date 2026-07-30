import type { LucideIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const iconVariants = cva('shrink-0', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-8',
      xl: 'size-10',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface IconProps extends VariantProps<typeof iconVariants> {
  icon: LucideIcon;
  className?: string;
  /** Only set this when the icon is the sole content of an interactive element with no visible label. */
  label?: string;
}

/** Standardizes Lucide icon sizing across the app — consumers stop repeating `className="size-4"`
 * at every call site. Decorative by default (`aria-hidden`); pass `label` when it's not. */
function Icon({ icon: LucideIconComponent, size, className, label }: IconProps) {
  return (
    <LucideIconComponent
      className={cn(iconVariants({ size }), className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}

export { Icon };
