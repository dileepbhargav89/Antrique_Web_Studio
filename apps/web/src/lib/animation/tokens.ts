/**
 * JS-side mirror of styles/tokens/tokens.css's motion tokens — GSAP/Motion
 * take numeric durations (seconds) and cubic-bezier arrays, not CSS custom
 * properties, so this duplication is deliberate, not an oversight. Keep
 * both in sync manually; this is a small, rarely-changed set.
 */
export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

/**
 * [x1, y1, x2, y2] cubic-bezier control points, matching tokens.css's
 * --ease-* values. Typed as a literal 4-tuple (not `as const`, which would
 * produce a readonly tuple `motion`'s `Easing` type won't accept) so
 * these can be passed to `transition.ease` without a cast at every call
 * site.
 */
type CubicBezier = [number, number, number, number];

export const EASE: Record<'in' | 'out' | 'inOut' | 'spring', CubicBezier> = {
  in: [0.4, 0, 1, 1],
  out: [0, 0, 0.2, 1],
  inOut: [0.4, 0, 0.2, 1],
  spring: [0.34, 1.56, 0.64, 1],
};

/** GSAP's own named-ease strings, for code that calls into GSAP directly instead of `motion`. */
export const GSAP_EASE = {
  in: 'power2.in',
  out: 'power2.out',
  inOut: 'power2.inOut',
  spring: 'back.out(1.7)',
} as const;

/**
 * `motion`'s spring transition presets — before this, every spring-based animation
 * (`components/motion/magnetic-button.tsx`, `lib/animation/use-parallax.ts`) hand-rolled its
 * own `{stiffness, damping, mass}` literal. `smooth`/`gentle` below match those two files'
 * existing values exactly (not changed, just named); `snappy` is new, for fast state swaps
 * like a nav active-indicator.
 */
export const SPRING = {
  snappy: { stiffness: 400, damping: 35, mass: 1 },
  smooth: { stiffness: 200, damping: 15, mass: 0.2 },
  gentle: { stiffness: 60, damping: 20, mass: 0.5 },
} as const;

/** Reveal-animation travel distance, in pixels — `components/motion/*` primitives accept
 * their own `distance`/`childDistance` props already; this is the shared reference scale for
 * new call sites to pick from instead of another one-off number. */
export const REVEAL_DISTANCE = {
  sm: 16,
  base: 24,
  lg: 40,
} as const;

/**
 * Per-item delay for staggered reveals — before this, `Stagger`'s own default (0.08),
 * `TechStackStrip`/the mobile nav menu (0.04), and `Timeline`'s literal `index * 0.1` were
 * three unrelated numbers with no documented relationship. `tight` = small/many items (chip
 * cascades, short menu lists), `base` = `Stagger`'s own default, `loose` = fewer/larger
 * content blocks (a process timeline).
 */
export const STAGGER_DELAY = {
  tight: 0.04,
  base: 0.08,
  loose: 0.1,
} as const;
