'use client';

import { motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { EASE } from '@/lib/animation/tokens';

export interface MeshGradientProps {
  className?: string;
}

/**
 * Decorative, `aria-hidden` background wash — 2-3 large blurred radial-gradient blobs built
 * only from existing design tokens (`--accent`/`--primary`/`--background`, via relative-color
 * syntax so they stay theme-correct in both light/dark automatically), never a new hue. The
 * parent must be `relative overflow-hidden` — this fills it via `absolute inset-0`. A very
 * slow, subtle position drift (20-30s loops) — frozen entirely under reduced-motion, same
 * pattern as `components/motion/floating.tsx`. Opacities are deliberately dim (not the
 * original /25-/10 range): on the homepage this sits directly behind the hero's accent-colored
 * wireframe sphere, and a same-hue glow at higher opacity behind it reduced the sphere's own
 * contrast instead of just lighting it.
 */
function MeshGradient({ className }: MeshGradientProps) {
  const reduceMotion = useReducedMotion();

  const blobs = [
    {
      className: 'top-[-10%] right-[-5%] size-[55%] bg-accent/12',
      animate: reduceMotion ? undefined : { x: [0, 24, 0], y: [0, -16, 0] },
      duration: 26,
    },
    {
      className: 'bottom-[-15%] left-[-10%] size-[60%] bg-primary/8',
      animate: reduceMotion ? undefined : { x: [0, -20, 0], y: [0, 18, 0] },
      duration: 32,
    },
    {
      className: 'top-[30%] left-[20%] size-[35%] bg-accent/5',
      animate: reduceMotion ? undefined : { x: [0, 14, 0], y: [0, 14, 0] },
      duration: 22,
    },
  ];

  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
      {blobs.map((blob, index) => (
        <motion.div
          key={index}
          animate={blob.animate}
          transition={{ duration: blob.duration, repeat: Infinity, ease: EASE.inOut }}
          className={cn('absolute rounded-full blur-3xl', blob.className)}
        />
      ))}
    </div>
  );
}

export { MeshGradient };
