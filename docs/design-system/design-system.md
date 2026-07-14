# Design System

**Token-first, single source of truth.** Components bind to a SEMANTIC token
layer (surface, text-primary, action) pointing at PRIMITIVE ramps (Navy, Teal,
Slate, feedback). Dark mode reassigns only the semantic layer — same markup themes
automatically. Implemented in `apps/web/src/styles/tokens` (tokens.css +
components.css) and mirrored into the Tailwind theme.

## Foundations
- **Color:** Navy brand, Teal accent, Slate neutrals, feedback ramps. 27 semantic
  tokens, AA-verified in both themes.
- **Type:** modular ~1.25 scale (text-xs→6xl), rem-based, one family, weight-driven
  hierarchy, 65–75ch measure.
- **Spacing:** 4px base scale (space-1→24). Radius sm/md/lg/full. 4-step shadows.
- **Grid:** 12-col fluid, 1280px max container. Breakpoints: mobile ≤640, tablet
  641–1024, desktop 1025–1440, wide >1440.
- **Z-index scale:** dropdown < sticky < overlay < modal < toast.

## Components (built on tokens)
Buttons (variants/sizes/states), cards, form fields + validation states, badges/
tags/chips, alerts, toasts, responsive data table (stacks on mobile), modal.
State always dual-coded (color + icon/text); focus always visible; destructive/
irreversible actions confirmed.

## Theming & accessibility
System-preference default + user override. Dark mode is not inversion — surfaces
desaturate, text stops lift, elevation shifts to borders. AA both themes; reduced-
motion honored globally; keyboard-operable; state never color-only.

## Governance
Components consume semantic tokens / Tailwind utilities, never raw values. New
value needed → add a token. This is what keeps 20+ page types × 2 themes consistent.
