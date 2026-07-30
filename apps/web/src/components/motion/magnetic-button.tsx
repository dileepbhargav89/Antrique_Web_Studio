'use client';

import * as React from 'react';
import { motion, useMotionValue, useSpring, type HTMLMotionProps } from 'motion/react';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { SPRING } from '@/lib/animation/tokens';

export interface MagneticButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  /** How far the button can be pulled toward the cursor, in pixels. */
  strength?: number;
}

/** Wraps a native `<button>` — for a styled button, put `components/ui/button.tsx`'s Button
 * INSIDE this as `children`, don't duplicate button styling here. */
function MagneticButton({ strength = 16, className, children, ...props }: MagneticButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING.smooth);
  const springY = useSpring(y, SPRING.smooth);
  const reduceMotion = useReducedMotion();

  const handleMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = event.clientX - (rect.left + rect.width / 2);
    const relY = event.clientY - (rect.top + rect.height / 2);
    x.set((relX / rect.width) * strength);
    y.set((relY / rect.height) * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={reduceMotion ? undefined : { x: springX, y: springY }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export { MagneticButton };
