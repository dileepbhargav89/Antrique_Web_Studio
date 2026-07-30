'use client';

import { motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { DURATION, EASE, REVEAL_DISTANCE, STAGGER_DELAY } from '@/lib/animation/tokens';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  icon?: React.ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

/**
 * Each step reveals in sequence as it scrolls into view (per-index stagger delay), the
 * connecting line "draws" itself via `scaleY` (a GPU transform, not a `height` change — cheap,
 * matches the performance rule against layout-thrashing animations), and the step marker gets
 * a small scale-in plus a persistent accent ring once revealed. "Active step" is deliberately
 * simplified to "highlighted once revealed, stays highlighted" rather than true continuous
 * scroll-position tracking of a single current step — a much larger, harder-to-tune-blind
 * feature, not silently reduced without saying so. Fully static (no animation, everything at
 * its end state) under reduced-motion.
 */
function Timeline({ items, className }: TimelineProps) {
  const reduceMotion = useReducedMotion();

  return (
    <ol className={cn('relative space-y-6', className)}>
      {items.map((item, index) => (
        <motion.li
          key={item.id}
          initial={reduceMotion ? false : { opacity: 0, y: REVEAL_DISTANCE.sm }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            duration: DURATION.slow,
            ease: EASE.out,
            delay: reduceMotion ? 0 : index * STAGGER_DELAY.loose,
          }}
          className="relative flex gap-4"
        >
          <div className="flex flex-col items-center">
            <motion.span
              initial={reduceMotion ? false : { scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{
                duration: DURATION.base,
                ease: EASE.spring,
                delay: reduceMotion ? 0 : index * STAGGER_DELAY.loose + 0.1,
              }}
              className="border-accent/50 bg-background text-muted-foreground ring-accent/20 flex size-6 shrink-0 items-center justify-center rounded-full border ring-2"
            >
              {item.icon ?? <span aria-hidden="true" className="bg-accent size-2 rounded-full" />}
            </motion.span>
            {index < items.length - 1 ? (
              <motion.span
                aria-hidden="true"
                initial={reduceMotion ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{
                  duration: DURATION.slower,
                  ease: EASE.out,
                  delay: reduceMotion ? 0 : index * STAGGER_DELAY.loose,
                }}
                className="bg-border mt-1 w-px flex-1 origin-top"
              />
            ) : null}
          </div>
          <div className="pb-2">
            <p className="text-sm font-medium">{item.title}</p>
            {item.timestamp ? (
              <time className="text-muted-foreground text-xs">{item.timestamp}</time>
            ) : null}
            {item.description ? (
              <p className="text-muted-foreground mt-1 text-sm">{item.description}</p>
            ) : null}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

export { Timeline };
