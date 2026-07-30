import { useReducedMotion as useMotionReducedMotion } from 'motion/react';

/**
 * Thin re-export, kept as our own hook (not a direct `motion/react` import
 * at every call site) so every components/motion/* primitive imports from
 * one place — swapping the underlying animation library later only means
 * editing this file. Returns `true` when the OS-level
 * `prefers-reduced-motion: reduce` is set; every animation primitive in
 * `components/motion/` skips its actual motion entirely when this is
 * true, per CONTRIBUTING.md's accessibility floor ("Respect
 * reduced-motion") — not just shortened, skipped.
 */
export function useReducedMotion(): boolean {
  return useMotionReducedMotion() ?? false;
}
