import { useScroll, type MotionValue } from 'motion/react';

/**
 * Continuous 0-1 page-scroll progress, for anything that should track scroll position smoothly
 * (a progress bar, a navbar's blur/opacity ramp) instead of snapping between two states at a
 * fixed threshold. Thin wrapper over `motion`'s own `useScroll()` (no target = whole document)
 * — its `scrollYProgress` is already exactly this value; not hand-rolling a scroll listener.
 */
export function useScrollProgress(): MotionValue<number> {
  const { scrollYProgress } = useScroll();
  return scrollYProgress;
}
