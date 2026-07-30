'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { DURATION } from '@/lib/animation/tokens';

interface RippleInstance {
  id: number;
  x: number;
  y: number;
  size: number;
}

export interface RippleProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
}

/** Wraps any clickable content in a `position: relative` container and renders an expanding,
 * fading circle from the click point — a Material-style click-feedback effect, not a full
 * button. Compose it around `components/ui/button.tsx`'s Button, don't replace it. */
function Ripple({
  color = 'currentColor',
  className,
  children,
  onPointerDown,
  ...props
}: RippleProps) {
  const [ripples, setRipples] = React.useState<RippleInstance[]>([]);
  const reduceMotion = useReducedMotion();

  const addRipple = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    setRipples((prev) => [
      ...prev,
      { id: Date.now(), x: event.clientX - rect.left, y: event.clientY - rect.top, size },
    ]);
  };

  const removeRipple = (id: number) => setRipples((prev) => prev.filter((r) => r.id !== id));

  return (
    <div className={cn('relative overflow-hidden', className)} onPointerDown={addRipple} {...props}>
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            initial={{ opacity: 0.35, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            transition={{ duration: DURATION.slower }}
            onAnimationComplete={() => removeRipple(ripple.id)}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              marginLeft: -ripple.size / 2,
              marginTop: -ripple.size / 2,
              borderRadius: '9999px',
              backgroundColor: color,
              pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export { Ripple };
