'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

import { DURATION, EASE } from '@/lib/animation/tokens';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

export interface ScaleProps extends HTMLMotionProps<'div'> {
  delay?: number;
  duration?: number;
  from?: number;
  inView?: boolean;
}

function Scale({
  delay = 0,
  duration = DURATION.base,
  from = 0.9,
  inView = false,
  ...props
}: ScaleProps) {
  const reduceMotion = useReducedMotion();
  const target = { opacity: 1, scale: 1 };

  if (reduceMotion) {
    return <motion.div initial={target} animate={target} {...props} />;
  }

  const animateProp = inView
    ? { whileInView: target, viewport: { once: true, amount: 0.3 } }
    : { animate: target };

  return (
    <motion.div
      initial={{ opacity: 0, scale: from }}
      transition={{ duration, delay, ease: EASE.spring }}
      {...animateProp}
      {...props}
    />
  );
}

export { Scale };
