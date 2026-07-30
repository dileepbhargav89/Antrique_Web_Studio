'use client';

import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';

import { DURATION, EASE } from '@/lib/animation/tokens';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

export interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Not wired into any layout — a future template.tsx (Next.js's own
 * per-navigation-remount file convention, the correct place for this)
 * would wrap its children in this. Provided here as the reusable
 * transition itself, since building that decision is a page-level
 * concern out of this phase's scope.
 */
function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return children;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: DURATION.base, ease: EASE.inOut }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export { PageTransition };
