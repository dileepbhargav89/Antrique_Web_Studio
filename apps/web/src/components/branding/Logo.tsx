'use client';

import { useId, type SVGProps } from 'react';
import { cn } from '@/lib/utils';

export interface LogoProps extends SVGProps<SVGSVGElement> {
  /** Accessible title for standalone usage — e.g. if this mark is ever rendered
   * without a surrounding element that already supplies an accessible name.
   * Omit at call sites where a parent (like the navbar's "Home" link) already
   * carries an `aria-label` — the icon then renders `aria-hidden`, so screen
   * readers don't announce it a second time. */
  title?: string;
}

/**
 * The Antrique monogram — a circular sweep enclosing an abstract "A" (two
 * gradient-filled legs) crossed by a lighter diagonal ribbon that exits past
 * the ring, echoing the brand mark's gold circular badge (see docs/logo.png,
 * used only as a visual reference — this is original vector artwork, not a
 * trace). Three shapes, all gradient-filled/stroked: pure vector, no raster
 * data anywhere.
 *
 * Gradient stops are built from the design system's own `--accent` token via
 * `color-mix(in oklch, ...)` — the same technique `components/ui/button.tsx`
 * already uses for its own hover states — rather than hard-coded hex, so the
 * mark stays in lockstep with the site's actual gold/amber accent in both
 * themes instead of drifting into its own fixed palette.
 *
 * Gradient/filter `id`s are suffixed with `useId()` because this component
 * can render more than once per page (desktop brand link + mobile drawer) —
 * unsuffixed ids would collide as duplicate DOM ids, which is invalid HTML
 * and, in some browsers, makes the second instance silently render the
 * first instance's gradients.
 */
function Logo({ className, title, ...props }: LogoProps) {
  const uid = useId();
  const ringId = `antrique-logo-ring-${uid}`;
  const legId = `antrique-logo-leg-${uid}`;
  const ribbonId = `antrique-logo-ribbon-${uid}`;
  const shadowId = `antrique-logo-shadow-${uid}`;

  return (
    <svg
      viewBox="0 0 40 40"
      className={cn('size-9 shrink-0 sm:size-11', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {/* Ring: the "circular sweep" — brightest at the upper-left highlight,
            deepening to bronze at the lower-right for a soft embossed feel. */}
        <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="color-mix(in oklch, var(--accent), white 35%)" />
          <stop offset="50%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="color-mix(in oklch, var(--accent), black 40%)" />
        </linearGradient>
        {/* The "A" legs: warm gold rising from a darker bronze base to a
            bright amber tip — a subtle highlight, not a hard specular shine. */}
        <linearGradient id={legId} x1="0%" y1="100%" x2="60%" y2="0%">
          <stop offset="0%" stopColor="color-mix(in oklch, var(--accent), black 30%)" />
          <stop offset="55%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="color-mix(in oklch, var(--accent), white 25%)" />
        </linearGradient>
        {/* The diagonal ribbon/sweep — the lightest element, reading as a
            premium foil accent crossing the mark. */}
        <linearGradient id={ribbonId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="color-mix(in oklch, var(--accent), black 5%)" />
          <stop offset="100%" stopColor="color-mix(in oklch, var(--accent), white 60%)" />
        </linearGradient>
        {/* Soft shadow only — deliberately no outer glow baked in here; any
            hover glow is applied by the consumer (see navbar composition)
            so this component stays inert by default, per "no excessive
            shine." */}
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.9" floodColor="black" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter={`url(#${shadowId})`}>
        <circle cx="20" cy="20" r="17" fill="none" stroke={`url(#${ringId})`} strokeWidth="1.8" />
        <path
          d="M20 9 L9.5 31 M20 9 L30.5 31"
          fill="none"
          stroke={`url(#${legId})`}
          strokeWidth="4.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11 26.5 L33.5 6"
          fill="none"
          stroke={`url(#${ribbonId})`}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export { Logo };
