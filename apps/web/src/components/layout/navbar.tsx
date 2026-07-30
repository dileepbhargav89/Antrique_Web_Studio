'use client';

import { useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';

import { cn } from '@/lib/utils';

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Left slot — typically a logo/wordmark. */
  brand?: React.ReactNode;
  /** Center/main nav slot. */
  nav?: React.ReactNode;
  /** Right slot — actions (theme toggle, CTA, auth state). */
  actions?: React.ReactNode;
  sticky?: boolean;
}

/** How many pixels of scroll the transition ramps over — a short window, not tied to total
 * page length (unlike the scroll-progress bar, which cares about the whole page). */
const SCROLL_RAMP_PX = 120;

/** Structural shell only — no nav items, no business logic. A future page composes its own
 * links/actions into the slots below. Floats with margin from the viewport edges rather than
 * spanning full-width — transparent/borderless at the top of the page, picking up a rounded
 * glass "pill" treatment as the user scrolls. Blur and background opacity ramp continuously
 * with scroll position (`useTransform` on raw `scrollY`, not a boolean threshold swap) so the
 * transition reads as gradual; border/shadow (not natively interpolatable CSS values) still
 * use a plain CSS `transition`, gated by a threshold crossing of the same continuous value —
 * a deliberate simplification, not an oversight. */
function Navbar({ brand, nav, actions, sticky = true, className, ...props }: NavbarProps) {
  const { scrollY } = useScroll();
  const blurPx = useTransform(scrollY, [0, SCROLL_RAMP_PX], [0, 12]);
  const backdropFilter = useTransform(blurPx, (value) => `blur(${value}px)`);
  const backgroundColor = useTransform(
    scrollY,
    [0, SCROLL_RAMP_PX],
    ['oklch(from var(--background) l c h / 0)', 'oklch(from var(--background) l c h / 0.8)'],
  );
  const [scrolledPastHalf, setScrolledPastHalf] = useState(false);
  useMotionValueEvent(scrollY, 'change', (value) => {
    setScrolledPastHalf(value > SCROLL_RAMP_PX / 2);
  });

  return (
    <header
      className={cn(
        'top-0 z-[var(--z-sticky)] w-full px-3 pt-3 sm:px-6',
        sticky && 'sticky',
        className,
      )}
      {...props}
    >
      <motion.div
        style={{ backdropFilter, WebkitBackdropFilter: backdropFilter, backgroundColor }}
        className={cn(
          'mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 rounded-2xl border px-4 transition-[border-color,box-shadow] duration-300 sm:px-6',
          scrolledPastHalf ? 'border-border shadow-sm' : 'border-transparent',
        )}
      >
        <div className="flex items-center gap-6">
          {brand}
          {nav}
        </div>
        {actions}
      </motion.div>
    </header>
  );
}

export { Navbar };
