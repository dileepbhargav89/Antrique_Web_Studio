# UI components — primitives, layout, and feature groups

- `ui/` — shadcn/Radix-based primitives + a handful of hand-built ones
  (multi-select, spinner, empty/error state, stats card, timeline, data
  grid, icon). See `docs/architecture/design-system.md` §3.
- `layout/` — structural shells (`Container`, `Grid`, `Navbar`, `Sidebar`)
  — no nav items, no page content.
- `forms/` — RHF+Zod form wrapper set (`form.tsx`). See design-system.md §4.
- `motion/` — GSAP/Motion animation primitives. See design-system.md §6.
- `three/` — React Three Fiber wrappers. See design-system.md §7.
- `media/` — Image/Video wrappers. See design-system.md §8.
- `marketing/`, `portal/` — still empty; feature-specific, built in a
  future phase, never cross-imported (`CONTRIBUTING.md` §2).

Full token/component/accessibility reference: `docs/architecture/
design-system.md`.
