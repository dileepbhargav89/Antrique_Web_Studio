'use client';

import { motion } from 'motion/react';

import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { useScrollProgress } from '@/lib/animation/use-scroll-progress';

/**
 * A thin, fixed bar at the very top of the viewport showing how far down the page the user
 * has scrolled — `scaleX` driven directly by a `MotionValue` (a GPU transform, not a `width`
 * change, per the performance rule against layout-thrashing animations). Purely decorative:
 * not rendered at all under reduced-motion, since it conveys no information nothing else on
 * the page already provides.
 */
function ScrollProgressBar() {
  const reduceMotion = useReducedMotion();
  const progress = useScrollProgress();

  if (reduceMotion) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: progress }}
      className="bg-accent fixed inset-x-0 top-0 z-[var(--z-toast)] h-0.5 origin-left"
    />
  );
}

export { ScrollProgressBar };
