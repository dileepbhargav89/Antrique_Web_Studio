'use client';

import * as React from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

import { DURATION, EASE, REVEAL_DISTANCE, STAGGER_DELAY } from '@/lib/animation/tokens';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';

export interface StaggerProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Delay between each direct child's animation start. */
  staggerDelay?: number;
  childDistance?: number;
  children: React.ReactNode;
}

const containerVariants = (staggerDelay: number) => ({
  hidden: {},
  show: { transition: { staggerChildren: staggerDelay } },
});

const itemVariants = (distance: number) => ({
  hidden: { opacity: 0, y: distance },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.out } },
});

/** Wraps each direct child in a motion item — children stay plain JSX, no `motion.*` needed at
 * the call site. */
function Stagger({
  staggerDelay = STAGGER_DELAY.base,
  childDistance = REVEAL_DISTANCE.sm,
  children,
  ...props
}: StaggerProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <motion.div {...props}>{children}</motion.div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants(staggerDelay)}
      {...props}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants(childDistance)}>{child}</motion.div>
      ))}
    </motion.div>
  );
}

export { Stagger };
