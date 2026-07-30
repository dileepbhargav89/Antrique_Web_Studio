'use client';

import { useRef } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';

import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { useParallax } from '@/lib/animation/use-parallax';
import { Floating } from '@/components/motion/floating';
import { Scale } from '@/components/motion/scale';
import { GlassPanel } from './glass-panel';

interface FloatingCardSpec {
  className: string;
  parallaxStrength: number;
  floatDistance: number;
  floatDuration: number;
  dotColor: string;
}

const CARDS: FloatingCardSpec[] = [
  {
    className: 'top-[8%] left-[6%] h-24 w-40',
    parallaxStrength: 18,
    floatDistance: 8,
    floatDuration: 4.5,
    dotColor: 'bg-accent',
  },
  {
    className: 'top-[42%] right-[2%] h-28 w-44',
    parallaxStrength: 28,
    floatDistance: 12,
    floatDuration: 5.5,
    dotColor: 'bg-success',
  },
  {
    className: 'bottom-[10%] left-[18%] h-20 w-36',
    parallaxStrength: 12,
    floatDistance: 6,
    floatDuration: 3.8,
    dotColor: 'bg-info',
  },
];

interface FloatingCardProps {
  card: FloatingCardSpec;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

function FloatingCard({ card, x, y }: FloatingCardProps) {
  const cardX = useTransform(x, (value: number) => value * card.parallaxStrength);
  const cardY = useTransform(y, (value: number) => value * card.parallaxStrength * 0.6);

  return (
    <motion.div style={{ x: cardX, y: cardY }} className={`absolute ${card.className}`}>
      <Floating distance={card.floatDistance} duration={card.floatDuration}>
        <GlassPanel className="flex h-full w-full flex-col gap-2 rounded-2xl p-3 shadow-lg">
          <span className={`size-2 rounded-full ${card.dotColor}`} />
          <span className="bg-foreground/15 h-1.5 w-4/5 rounded-full" />
          <span className="bg-foreground/10 h-1.5 w-3/5 rounded-full" />
        </GlassPanel>
      </Floating>
    </motion.div>
  );
}

/**
 * Replaces the previous React Three Fiber wireframe-sphere hero scene entirely — pure
 * CSS/SVG/Motion, no WebGL, no external images (this project has no image-fetching tool).
 * Sits over `HomeHero`'s own section-level `MeshGradient` (not a second one here, to avoid
 * stacking two animated blur layers) — a low-opacity SVG dot-grid plus 2-3 abstract
 * "interface" glass cards (a colored status dot + two skeleton lines each — suggesting a
 * product UI without faking a real screenshot) that both drift independently (`Floating`) and
 * react to real mouse position (`useParallax`) for a layered parallax effect. Fully
 * `aria-hidden` — decorative only, no content depends on it. `three.js`/`@react-three/fiber`
 * foundation files (`components/three/*`) are left in place, just no longer imported by the hero.
 */
function HeroIllustration() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { x, y } = useParallax(containerRef, reduceMotion);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="relative hidden aspect-square w-full max-w-md overflow-hidden lg:block"
    >
      <svg className="absolute inset-0 size-full opacity-[0.07]" aria-hidden="true">
        <pattern id="hero-dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" className="fill-foreground" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#hero-dot-grid)" />
      </svg>
      <Scale className="absolute inset-6" delay={0.3}>
        <GlassPanel className="size-full" />
      </Scale>
      {CARDS.map((card, index) => (
        <FloatingCard key={index} card={card} x={x} y={y} />
      ))}
    </div>
  );
}

export { HeroIllustration };
