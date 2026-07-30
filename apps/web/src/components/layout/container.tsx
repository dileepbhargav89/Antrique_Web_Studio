import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const containerVariants = cva('mx-auto w-full px-4 sm:px-6 lg:px-8', {
  variants: {
    size: {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-none',
    },
  },
  defaultVariants: {
    size: 'xl',
  },
});

/**
 * `as` is a fixed tag union, not `React.ElementType` — an unconstrained
 * generic element-type prop breaks once `@react-three/fiber`'s global
 * JSX.IntrinsicElements augmentation is anywhere in the program (its
 * types widen every generic `React.ElementType` resolution project-wide,
 * a known R3F typings quirk) — verified by this exact error appearing the
 * moment @react-three/fiber was installed. A closed union of the tags a
 * layout container legitimately needs sidesteps it entirely.
 */
type ContainerTag = 'div' | 'section' | 'main' | 'article' | 'header' | 'footer';

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof containerVariants> {
  as?: ContainerTag;
}

export function Container({ className, size, as: Component = 'div', ...props }: ContainerProps) {
  return <Component className={cn(containerVariants({ size }), className)} {...props} />;
}
