'use client';

import { motion } from 'motion/react';

import { cn } from '@/lib/utils';
import { DURATION, EASE } from '@/lib/animation/tokens';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

/** Fixed tag union, not `React.ElementType` — see container.tsx's identical comment for why. */
type TextRevealTag = 'p' | 'span' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';

export interface TextRevealProps {
  text: string;
  as?: TextRevealTag;
  className?: string;
  /** Delay between each word's reveal. */
  staggerDelay?: number;
}

const container = (staggerDelay: number) => ({
  hidden: {},
  show: { transition: { staggerChildren: staggerDelay } },
});

const word = {
  hidden: { opacity: 0, y: '0.5em' },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.out } },
};

/**
 * Splits plain text into words and reveals them word-by-word on scroll —
 * a manual split, not GSAP's SplitText plugin (avoids an extra plugin
 * registration for a effect this simple to build directly with `motion`).
 */
function TextReveal({
  text,
  as: Component = 'p',
  className,
  staggerDelay = 0.06,
}: TextRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <Component className={className}>{text}</Component>;
  }

  const MotionComponent = motion.create(Component);
  const words = text.split(' ');

  return (
    <MotionComponent
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      variants={container(staggerDelay)}
      className={cn('inline-block', className)}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="mt-[-0.2em] inline-block overflow-hidden pt-[0.2em]">
          <motion.span variants={word} className="inline-block">
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </MotionComponent>
  );
}

export { TextReveal };
