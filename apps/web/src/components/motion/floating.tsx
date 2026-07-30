'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { EASE } from '@/lib/animation/tokens';

export interface FloatingProps extends HTMLMotionProps<'div'> {
  distance?: number;
  duration?: number;
}

/** A continuous, idle up/down loop — for hero art, badges, decorative elements. Always disabled
 * under reduced-motion (there's no "once" fallback for a looping animation — it just doesn't
 * run). */
function Floating({ distance = 10, duration = 3, ...props }: FloatingProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <motion.div {...props} />;
  }

  return (
    <motion.div
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, repeat: Infinity, ease: EASE.inOut }}
      {...props}
    />
  );
}

export { Floating };
