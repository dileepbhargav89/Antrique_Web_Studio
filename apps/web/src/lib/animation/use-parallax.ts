import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'motion/react';

import { SPRING } from './tokens';

export interface ParallaxValues {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

/**
 * Tracks mouse position relative to a container element, returning spring-smoothed x/y
 * offsets normalized to roughly [-1, 1] (distance from center, as a fraction of half the
 * container's width/height). Consumers multiply by their own per-element "strength" in
 * pixels for a parallax effect (elements meant to feel closer use a larger multiplier).
 * Same `useMotionValue`/`useSpring` primitives `components/motion/magnetic-button.tsx`
 * already uses — not a new animation approach. Returns steady `{x: 0, y: 0}` (no listener
 * attached at all) under `prefers-reduced-motion`, matching every other motion primitive's
 * reduced-motion contract in this codebase.
 *
 * Listens on `window`, not the container itself — a decorative parallax container is
 * typically `pointer-events-none` (so it can never intercept clicks on real content), and an
 * element with `pointer-events: none` never receives its own pointer events, including
 * `mousemove`. Listening on `window` and computing the offset against the container's own
 * bounding rect works regardless of the container's pointer-events value, and also means the
 * effect tracks mouse position across the whole viewport, not just while the cursor is
 * exactly over the (often small) decorative element.
 */
export function useParallax(
  containerRef: React.RefObject<HTMLElement | null>,
  reduceMotion: boolean,
): ParallaxValues {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING.gentle);
  const springY = useSpring(y, SPRING.gentle);
  const frozen = useRef(reduceMotion);
  frozen.current = reduceMotion;

  useEffect(() => {
    if (reduceMotion) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (frozen.current) return;
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      x.set(((event.clientX - rect.left) / rect.width - 0.5) * 2);
      y.set(((event.clientY - rect.top) / rect.height - 0.5) * 2);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [containerRef, reduceMotion, x, y]);

  return { x: springX, y: springY };
}
