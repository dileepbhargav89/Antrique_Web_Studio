/**
 * Pixel values for JS-driven responsive logic (e.g. a future
 * `useBreakpoint()` hook — not built yet, no consumer exists). Named
 * against Tailwind's own default breakpoint scale rather than inventing
 * new breakpoint names, so `tablet` below IS `sm`/`md` in Tailwind
 * classes, not a parallel system. See design-system.md's "Responsive
 * rules" for the full 5-tier mapping.
 */
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  laptop: 1024,
  desktop: 1280,
  wide: 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
