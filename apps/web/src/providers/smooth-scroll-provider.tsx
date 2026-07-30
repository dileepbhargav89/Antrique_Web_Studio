'use client';

import * as React from 'react';
import Lenis from 'lenis';

import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

/**
 * Deliberately NOT mounted in app-providers.tsx/layout.tsx — Lenis
 * smooth-scroll is a per-experience choice (a marketing landing page may
 * want it, a data-heavy portal screen may not), and mounting it globally
 * would impose its bundle cost + behavior on every future route before
 * any page has opted in, against `docs/architecture/optimization.md`'s
 * "marketing ships minimal JS" budget. A future layout that wants it
 * wraps its own subtree: `<SmoothScrollProvider>{children}</SmoothScrollProvider>`.
 * Disabled entirely under `prefers-reduced-motion`.
 */
function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    if (reduceMotion) return;

    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, [reduceMotion]);

  return children;
}

export { SmoothScrollProvider };
