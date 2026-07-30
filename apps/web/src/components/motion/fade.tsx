'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

import { DURATION, EASE } from '@/lib/animation/tokens';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

export interface FadeProps extends HTMLMotionProps<'div'> {
  delay?: number;
  duration?: number;
  /** Animate once when scrolled into view, instead of immediately on mount. */
  inView?: boolean;
}

function Fade({ delay = 0, duration = DURATION.base, inView = false, ...props }: FadeProps) {
  const reduceMotion = useReducedMotion();

  const target = { opacity: 1 };

  if (reduceMotion) {
    return <motion.div initial={target} animate={target} {...props} />;
  }

  const animateProp = inView
    ? { whileInView: target, viewport: { once: true, amount: 0.3 } }
    : { animate: target };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      transition={{ duration, delay, ease: EASE.out }}
      {...animateProp}
      {...props}
    />
  );
}

export { Fade };
