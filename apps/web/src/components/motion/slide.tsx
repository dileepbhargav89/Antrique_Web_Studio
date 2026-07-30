'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

import { DURATION, EASE } from '@/lib/animation/tokens';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

export interface SlideProps extends HTMLMotionProps<'div'> {
  direction?: 'up' | 'down' | 'left' | 'right';
  distance?: number;
  delay?: number;
  duration?: number;
  inView?: boolean;
}

const AXIS: Record<NonNullable<SlideProps['direction']>, { key: 'x' | 'y'; sign: 1 | -1 }> = {
  up: { key: 'y', sign: 1 },
  down: { key: 'y', sign: -1 },
  left: { key: 'x', sign: 1 },
  right: { key: 'x', sign: -1 },
};

function Slide({
  direction = 'up',
  distance = 24,
  delay = 0,
  duration = DURATION.base,
  inView = false,
  ...props
}: SlideProps) {
  const reduceMotion = useReducedMotion();
  const { key, sign } = AXIS[direction];
  const target = { opacity: 1, [key]: 0 };

  if (reduceMotion) {
    return <motion.div initial={target} animate={target} {...props} />;
  }

  const initial = { opacity: 0, [key]: distance * sign };
  const animateProp = inView
    ? { whileInView: target, viewport: { once: true, amount: 0.3 } }
    : { animate: target };

  return (
    <motion.div
      initial={initial}
      transition={{ duration, delay, ease: EASE.out }}
      {...animateProp}
      {...props}
    />
  );
}

export { Slide };
