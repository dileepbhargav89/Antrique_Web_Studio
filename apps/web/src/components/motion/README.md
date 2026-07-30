# Animation primitives

`fade.tsx`, `scale.tsx`, `slide.tsx`, `reveal.tsx`, `stagger.tsx`,
`hover.tsx`, `magnetic-button.tsx`, `ripple.tsx`, `floating.tsx`,
`text-reveal.tsx`, `page-transition.tsx` — built on `motion` (Framer
Motion's successor); GSAP + ScrollTrigger live in `lib/animation/gsap.ts`
for scroll-driven sequences these don't cover. **Every** primitive checks
`lib/animation/use-reduced-motion.ts` and fully collapses its animation
(not just shortens it) when true. Nothing here is wired into any layout —
see `docs/architecture/design-system.md` §6 for the full architecture,
including why Lenis (`providers/smooth-scroll-provider.tsx`) stays
unmounted by default.
