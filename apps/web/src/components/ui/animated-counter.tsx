'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useMotionValue } from 'motion/react';

import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { EASE } from '@/lib/animation/tokens';

export interface AnimatedCounterProps {
  value: string | number;
  className?: string;
}

/** Matches a leading integer/decimal + whatever trails it (e.g. "160+" → ["160", "+"],
 * "85%+" → ["85", "%+"]). Anchored to the start — real stat values mix genuine numbers with
 * plain text ("WCAG 2.1 AA", "Multi-tenant, RLS-secured"); text that doesn't literally start
 * with a digit is never treated as countable, so nothing fakes a count-up out of a string
 * that was never a number to begin with. */
const LEADING_NUMBER = /^(\d+(?:\.\d+)?)(.*)$/;

/** Counts up from 0 to the real value once it first scrolls into view (never repeats on
 * re-scroll — `useInView`'s own `once: true`). Values without a leading number, and anything
 * under reduced-motion, render as static text immediately — no fake counting applied to
 * non-numeric stats. Lives in `components/ui` (not `components/marketing`) since it's a
 * generic primitive with no marketing-specific content/routing — `stats-card.tsx` (also
 * `components/ui`, used by the portal too) depends on it, and `components/ui` must never
 * depend on `components/marketing`. */
function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const match = String(value).match(LEADING_NUMBER);
  const [display, setDisplay] = useState(match ? '0' : String(value));
  const count = useMotionValue(0);

  useEffect(() => {
    if (!match || reduceMotion) {
      setDisplay(String(value));
      return;
    }
    if (!isInView) return;

    const [, numberText, suffix] = match;
    const target = Number(numberText);
    const controls = animate(count, target, {
      // A literal 1.2s, not a `DURATION` tier — count-up is a different animation *category*
      // than UI micro-transitions (reveals/hovers), conventionally longer; forcing it onto
      // that scale wouldn't be a real consistency win, just a coincidental number match.
      duration: 1.2,
      ease: EASE.out,
      onUpdate: (latest) => setDisplay(`${Math.round(latest)}${suffix}`),
    });
    return () => controls.stop();
    // Only re-runs when visibility/reduced-motion actually change — `count`/`match` are
    // stable for a given `value` prop, re-including them would just re-trigger identically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, reduceMotion, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

export { AnimatedCounter };
