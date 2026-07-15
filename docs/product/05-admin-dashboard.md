# 03 — Feature & Page Design

Every page specified across 15 dimensions: purpose, business goal, components,
sections, interactions, animations, validation, SEO, accessibility, responsive
behavior, and four state families (loading, empty, error, success).

## Cross-cutting standards (stated once, inherited)
- Responsive, mobile-first breakpoints; touch targets ≥44px.
- WCAG 2.1 AA baseline everywhere.
- Animation purposeful only, reduced-motion-safe, 150–350ms.
- State defaults: skeletons for loading, human-readable errors with recovery,
  success with a clear next step; global 404.
- SEO baseline: unique title/description, one H1, canonical, OG, schema.

## Quote wizard (primary conversion)
One question per screen, visible progress, pre-fill from referring page,
controlled inputs, contact captured last, trust rail throughout. Per-step inline
validation never loses data. **User-initiated, never auto-submitted.** Failure
preserves inputs + offers retry.

## Templated pages
Service Detail (×15) and Industry Detail (×10) each specified once; instances
differ in content, not design. State design overridden only where a page
genuinely differs.
