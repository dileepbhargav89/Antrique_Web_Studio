'use client';

import { motion, type HTMLMotionProps } from 'motion/react';

import { DURATION, EASE } from '@/lib/animation/tokens';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

export interface RevealProps extends HTMLMotionProps<'div'> {
  delay?: number;
  duration?: number;
}

/**
 * A distinct effect from Slide/Fade, not a re-skin: a clip-path "wipe"
 * combined with a subtle rise, scroll-triggered by default (a Reveal is
 * meant for scroll storytelling, unlike Fade/Slide's on-mount default).
 */
function Reveal({ delay = 0, duration = DURATION.slow, ...props }: RevealProps) {
  const reduceMotion = useReducedMotion();
  const target = { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)' };

  if (reduceMotion) {
    return <motion.div initial={target} animate={target} {...props} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, clipPath: 'inset(100% 0 0 0)' }}
      whileInView={target}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration, delay, ease: EASE.out }}
      {...props}
    />
  );
}

export { Reveal };
