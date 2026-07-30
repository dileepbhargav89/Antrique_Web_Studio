'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, useTransform } from 'motion/react';
import { ChevronDownIcon, SparklesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/layout/container';
import { TextReveal } from '@/components/motion/text-reveal';
import { Stagger } from '@/components/motion/stagger';
import { Fade } from '@/components/motion/fade';
import { Floating } from '@/components/motion/floating';
import { useReducedMotion } from '@/lib/animation/use-reduced-motion';
import { useParallax } from '@/lib/animation/use-parallax';
import { ROUTES } from '@/config/routes';
import { ENGINEERING_STATS } from '@/content/engineering-stats';
import { TECH_STACK } from '@/content/tech-stack';
import { MeshGradient } from './mesh-gradient';

const HeroScene = dynamic(() => import('./hero-scene'), { ssr: false });

// 2 of the real, verified facts from ENGINEERING_STATS — not a separate invented number.
const HERO_STATS = ENGINEERING_STATS.slice(0, 2);
// A compact subset for the hero's trust row — the full stack shows lower on the page
// (TechStackStrip); repeating all 10 up here would crowd the hero.
const HERO_TECH = TECH_STACK.slice(0, 5);

/**
 * The one bespoke hero on the site — every interior page uses `PageHero` instead. Editorial
 * two-column layout: copy + trust signals on the left, the original React Three Fiber
 * wireframe-sphere scene on the right (restored per explicit request after a brief swap to a
 * CSS/SVG illustration — kept the rest of that redesign pass: badge, highlighted copy, trust
 * row, mesh-gradient background). The "trust indicators" are real signals already true of this
 * codebase (tech stack, verified engineering stats) — never fabricated client counts/logos,
 * matching this project's established no-invented-content convention (see the homepage's own
 * "Featured work" section).
 */
function HomeHero() {
  const reduceMotion = useReducedMotion();
  const sceneWrapperRef = useRef<HTMLDivElement>(null);
  const illustrationContainerRef = useRef<HTMLDivElement>(null);
  const [sceneInView, setSceneInView] = useState(false);
  const parallax = useParallax(illustrationContainerRef, reduceMotion);
  const parallaxX = useTransform(parallax.x, (value) => value * 10);

  useEffect(() => {
    const node = sceneWrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setSceneInView(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <MeshGradient />
      <Container className="relative grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-8">
        <div className="flex max-w-xl flex-col gap-6">
          <Fade>
            <Badge variant="outline" className="h-7 gap-1.5 px-3 text-sm">
              <SparklesIcon aria-hidden="true" className="text-accent size-3.5" />
              Full-service web engineering studio
            </Badge>
          </Fade>
          <h1 className="font-heading text-5xl font-medium tracking-tight sm:text-6xl">
            <TextReveal as="span" text="Web software, made" />{' '}
            <TextReveal as="span" text="predictable." className="text-accent" />
          </h1>
          <Fade delay={0.15}>
            <p className="text-muted-foreground text-lg sm:text-xl">
              Secure, scalable, accessible web software — delivered through a{' '}
              <span className="text-foreground font-medium">productized engineering process</span>{' '}
              with expert human oversight at every stage, so what you commission is exactly what
              ships.
            </p>
          </Fade>
          <Stagger className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href={ROUTES.marketing.quote}>Get a Quote</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={ROUTES.marketing.work}>View Our Work</Link>
            </Button>
          </Stagger>
          <Fade delay={0.3} className="flex flex-col gap-3 pt-2">
            <div className="flex flex-wrap gap-2">
              {HERO_TECH.map((item) => (
                <Badge key={item.name} variant="secondary" className="text-xs">
                  {item.name}
                </Badge>
              ))}
            </div>
            <div className="border-border flex flex-wrap gap-6 border-t pt-4">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="flex flex-col">
                  <span className="font-heading text-2xl font-medium">{stat.value}</span>
                  <span className="text-muted-foreground text-xs">{stat.label}</span>
                </div>
              ))}
            </div>
          </Fade>
        </div>
        {!reduceMotion ? (
          <div
            ref={illustrationContainerRef}
            aria-hidden="true"
            className="pointer-events-none relative hidden aspect-square w-full max-w-md lg:block"
          >
            {/* A tighter glow behind just the illustration, on top of the section-wide
                MeshGradient — dimmed (was /25) so the wireframe sphere reads clearly against
                it instead of blending into a same-hue glow behind it. */}
            <div className="bg-accent/10 absolute inset-8 rounded-full blur-3xl" />
            <motion.div style={{ x: parallaxX }} className="relative size-full">
              <Floating distance={10} duration={5} className="size-full">
                <div ref={sceneWrapperRef} className="size-full">
                  {sceneInView ? <HeroScene /> : null}
                </div>
              </Floating>
            </motion.div>
          </div>
        ) : (
          // Reduced-motion: no WebGL scene at all (matches the original hero's own rule) — an
          // empty grid cell would leave the left column oddly off-center on large screens, so
          // fill it with the same static glass-panel backdrop the CSS illustration used.
          <div className="border-border/60 hidden aspect-square w-full max-w-md rounded-3xl border lg:block" />
        )}
      </Container>
      {!reduceMotion ? (
        <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 sm:flex">
          <span className="bg-muted-foreground/30 h-8 w-px animate-pulse" />
          <ChevronDownIcon
            aria-hidden="true"
            className="text-muted-foreground/60 size-4 animate-bounce"
          />
        </div>
      ) : null}
    </section>
  );
}

export { HomeHero };
