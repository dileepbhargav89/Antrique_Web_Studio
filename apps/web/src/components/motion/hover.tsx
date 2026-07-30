'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

import { DURATION } from '@/lib/animation/tokens';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

export interface HoverProps extends HTMLMotionProps<'div'> {
  scale?: number;
  lift?: number;
}

/** A generic hover-lift wrapper — for a per-component custom hover style, use `motion.div`
 * directly instead of forcing this shape. */
function Hover({ scale = 1.02, lift = 0, ...props }: HoverProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <motion.div {...props} />;
  }

  return (
    <motion.div
      whileHover={{ scale, y: -lift }}
      transition={{ duration: DURATION.fast }}
      {...props}
    />
  );
}

export { Hover };
