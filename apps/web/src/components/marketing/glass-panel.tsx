import * as React from 'react';

import { cn } from '@/lib/utils';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'span';
}

/**
 * Reusable glassmorphic surface — built on the SAME `--blur-glass` token `Navbar`/
 * `portal-header.tsx` already use (`backdrop-blur-glass`), not a new blur value. For hero
 * floating cards and any future glass surface; purely presentational, no motion of its own
 * (wrap it in `Floating`/`motion.div` at the call site for movement).
 */
function GlassPanel({ as: Component = 'div', className, ...props }: GlassPanelProps) {
  return (
    <Component
      className={cn(
        'bg-background/60 ring-foreground/10 rounded-3xl ring-1 backdrop-blur-glass',
        className,
      )}
      {...props}
    />
  );
}

export { GlassPanel };
