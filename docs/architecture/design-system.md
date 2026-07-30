# Design System & Component Library (apps/web)

Covers the reusable UI foundation built in this phase: design tokens,
responsive system, component library, form foundation, icon system,
animation foundation, 3D foundation, media foundation, and accessibility
rules. No pages, no business modules, no API integration — see
`docs/architecture/frontend.md` for the engineering-foundation phase this
builds on, and `docs/implementation/progress.md` for what's next.

## 1. Design tokens

All in `apps/web/src/styles/tokens/tokens.css` (`:root` + `.dark`), mapped
into Tailwind's utility namespace via `app/globals.css`'s `@theme inline`
block.

### Palette — "warm antique"

No brand guidance existed anywhere in the repo before this phase (checked
`docs/product/*`, confirmed empty). Direction resolved with the user:
charcoal/ink primary, brass/amber accent — referencing "Antrique" without
being kitschy. Every real pairing was contrast-verified with a throwaway
Node script (OKLCH → linear-sRGB → WCAG relative luminance; no dependency
added) rather than eyeballed. Verified ratios (light mode / dark mode):

| Pair | Light | Dark | Target |
|---|---|---|---|
| foreground / background | 17.71:1 | 17.29:1 | ≥4.5:1 |
| card-foreground / card | 17.20:1 | 15.97:1 | ≥4.5:1 |
| primary-foreground / primary | 16.39:1 | 14.58:1 | ≥4.5:1 |
| secondary-foreground / secondary | 14.56:1 | 13.45:1 | ≥4.5:1 |
| muted-foreground / muted | 5.50:1 | 5.64:1 | ≥4.5:1 |
| accent-foreground / accent | 5.37:1 | 8.58:1 | ≥4.5:1 |
| success-foreground / success | 5.84:1 | 7.17:1 | ≥4.5:1 |
| warning-foreground / warning | 7.80:1 | 9.52:1 | ≥4.5:1 |
| destructive-foreground / destructive | 5.07:1 | 6.72:1 | ≥4.5:1 |
| info-foreground / info | 5.16:1 | 6.77:1 | ≥4.5:1 |
| input / background (form-control boundary) | 3.50:1 | 3.23:1 | ≥3:1 |
| accent / background (ring/focus indicator) | 3.30:1 | 8.58:1 | ≥3:1 |

**Deliberate exception:** `--border` does NOT meet 3:1 against
`--background` in either theme (1.92:1 light / 1.53:1 dark) — matching
shadcn's own upstream convention of treating `--border` as a low-emphasis
decorative divider, not a WCAG 1.4.11 "UI component boundary." Real
form-control boundaries use the separate, more-visible `--input` token
(verified above); focus indicators use `--ring` (= `--accent`, verified
above). If a future audit wants every divider at 3:1 too, that's a
token-value change, not an architecture change.

`--chart-1..5` and `--sidebar-*` (carried over from the Phase 0 shadcn
scaffold) were re-hued to match the palette but were NOT contrast-verified
— they're categorical/decorative, not text/background pairs.

### Typography

Font FAMILIES are customized: `--font-sans` (Geist, body — unchanged from
Phase 0) and `--font-heading` (**Fraunces**, a warm soft-serif display
face — new this phase, replacing Phase 0's placeholder alias to
`--font-sans`). Both wired via `next/font/google` in `app/layout.tsx`.

Type SCALE, font weights, and letter-tracking are intentionally **not**
redeclared — Tailwind v4's built-in defaults already match what a
no-brand-guidance-yet scale should be, and redeclaring identical values
would be dead config. If a future brand review wants a different scale,
override it in `tokens.css`'s `@theme` block then.

**Role → class mapping** (audited against every real call site in
`components/marketing`, `components/ui`, `app/(marketing)` — Design
System Audit phase):

| Role | Classes | Where |
|---|---|---|
| Hero H1 (home only) | `font-heading text-5xl font-medium sm:text-6xl` | `home-hero.tsx` |
| Hero H1 (interior pages) | `font-heading text-4xl font-medium sm:text-5xl` | `page-hero.tsx` (shared) |
| Section H2 | `font-heading text-3xl font-medium sm:text-4xl` | `section-heading.tsx`, `cta-band.tsx` |
| Legal/wizard subsection H2 | `font-heading text-xl font-medium` | `terms/privacy` pages, `quote-wizard.tsx` |
| Card heading | `font-heading text-base leading-snug font-medium` (`text-sm` at `size=sm`) | `card.tsx`'s `CardTitle` |
| Eyebrow/label | `text-muted-foreground text-sm font-medium tracking-wide uppercase` | `section-heading.tsx` |
| Body copy | `text-muted-foreground text-base sm:text-lg` (varies `sm`/`base`/`lg` by context) | hero/section descriptions |
| Nav text | inherited from `Button`'s base `text-sm font-medium` | `site-nav.tsx` |
| Form label | `text-sm leading-none font-medium` | `components/ui/label.tsx` |
| Caption | `text-muted-foreground text-xs` | `blog-card.tsx`, `site-footer.tsx` legal bar |
| Brand wordmark | `font-heading text-lg font-medium` | `site-footer.tsx`, marketing `layout.tsx` — standardized to `font-medium` this phase (was `font-semibold`, the only outlier against every other `font-heading` usage) |

Two intentionally distinct H1/H2 tiers exist (hero vs. interior-page
title; marketing-section heading vs. legal/wizard subsection) — each
driven by exactly one shared component, so it's deliberate hierarchy, not
per-page drift. `Button`'s `sm` size previously used an arbitrary
`text-[0.8rem]` (between the real `text-xs`/`text-sm` steps) — corrected
to `text-sm` this phase.

### Spacing

Semantic aliases (`--space-gap-sm/md/lg`, `--space-card-padding`,
`--space-section-y[-lg]`) over Tailwind's existing numeric scale, for
layout components. **As of the Design System Audit phase these are real,
consumed tokens**, not aliases-in-name-only — an earlier audit found all
six declared but never referenced anywhere. Fixed by:
- Setting `--space-section-y`/`--space-section-y-lg` (4rem/5rem) to match
  the section-padding convention (`py-16 sm:py-20`) already converged on
  across the marketing site, then wiring representative call sites
  (`(marketing)/page.tsx`'s sections, `cta-band.tsx`,
  `(marketing)/loading.tsx`/`error.tsx`) to consume them via Tailwind
  v4's canonical CSS-variable syntax: `py-(--space-section-y)
  sm:py-(--space-section-y-lg)`. Same computed values as before — this
  makes the token real without any visual change. Not every one of the
  ~16 files using the literal `py-16 sm:py-20` pattern was migrated this
  phase (incremental, not a mass mechanical sweep) — remaining call sites
  are a mechanical Phase 2 follow-up, same substitution.
- Setting `--space-card-padding` to `1rem` (matching `Card`'s own
  pre-existing `--card-spacing` default) and pointing `Card`'s
  `--card-spacing` at `var(--space-card-padding)` instead of a separate
  hardcoded value — one source of truth, same rendered padding.
- `--space-gap-sm/md/lg` remain declared, available for the same
  treatment — not yet wired into a call site (no single representative
  "gap" convention emerged from the audit the way section-padding did).

### Radius scale

`--radius: 0.625rem` (base) → `--radius-sm/md/lg/xl/2xl/3xl/4xl` (0.6×
through 2.6× base) via `globals.css`'s `@theme inline` block. Real,
audited usage tiers:

| Tier | Used by |
|---|---|
| `rounded-xl` | Containers/overlays: `card`, `dialog`, `alert-dialog` |
| `rounded-lg` | Form controls: `input`, `textarea`, `button` (default), `select`/`dropdown-menu` content |
| `rounded-md` | Menu items (inside dropdown/select content) |
| `rounded-full` | Pills/circular: avatar, switch, progress, badges, timeline dots |
| `rounded-4xl` | `badge.tsx` — single-use, intentional pill shape |

**Documented exceptions, not changed:** `checkbox.tsx` (`rounded-[4px]`)
and `tooltip.tsx` (`rounded-[2px]`) hardcode raw-pixel radii smaller than
any defined tier (`--radius-sm` = 6px). Re-tiering either to the nearest
token would visibly change those elements' corners — left as
component-specific micro-scale exceptions rather than forced onto the
main scale.

### Shadow / elevation

A warm-tinted 5-step scale (`--shadow-sm`…`2xl`), overriding Tailwind's
neutral-gray defaults — **verified** to generate real `shadow-*` utility
classes (Tailwind v4's `--shadow-*` theme namespace does map to
utilities; checked the compiled CSS output directly, not assumed).

**Audited usage (Design System Audit phase):** containers/overlays
(`card`, `dialog`, `alert-dialog`) use `ring-1 ring-foreground/10` for
elevation instead of `shadow-*`; floating menus (`dropdown-menu`,
`select`, `popover`) use `shadow-md`/`shadow-lg`. Assessed as a coherent,
intentional two-tier pattern (containers get a subtle ring, transient
floating surfaces get a real shadow) — not touched, since unifying them
would be a visual redesign of elevation, not a consistency fix.
`shadow-xl`/`shadow-2xl` are currently unused anywhere; kept in the scale
for future use.

Focus-ring width had drifted to three different spellings for the same
3px value (`ring-3`, `ring-[3px]`, and a true 1px-narrower `ring-2`
outlier in `DataGrid`'s sortable header) — standardized to `ring-3`
everywhere this phase (`badge.tsx`, `tabs.tsx`, `data-grid.tsx`).
`breadcrumb.tsx`'s `BreadcrumbLink` had no focus-visible style at all —
added the same ring treatment used by every other interactive primitive.

### Blur / opacity / z-index / motion

- Blur: one custom `--blur-glass` token (12px) for a frosted-surface
  pattern (e.g. `Navbar`'s backdrop) — additive to Tailwind's default blur
  scale, also verified in compiled CSS (`backdrop-blur-glass` exists).
- Opacity: three semantic states (`--opacity-disabled/hover/overlay`) —
  reference-only; Tailwind's own `opacity-*`/`disabled:opacity-*`
  utilities cover the common cases directly.
- Z-index: a named 9-step scale (`--z-dropdown` … `--z-toast`) —
  **plain CSS custom properties, NOT registered in `@theme`**. Verified
  empirically that Tailwind v4 has no `z-*`-utility-generating namespace
  for these (unlike `--shadow-*`/`--blur-*`); consumed via arbitrary-value
  syntax (`z-[var(--z-sticky)]`, see `Navbar`) rather than a `z-sticky`
  utility class that doesn't exist.
- Motion: `--duration-fast/base/slow/slower` and `--ease-in/out/in-out/
  spring` — **also verified NOT to generate `duration-*`/`ease-*`
  utilities** in Tailwind v4 (checked compiled CSS, found none, removed
  the dead `@theme` mapping that implied otherwise). Consumed the same
  arbitrary-value way in CSS (`duration-[var(--duration-base)]`), and
  mirrored as plain JS constants in `lib/animation/tokens.ts` for
  GSAP/Motion, which can't read CSS custom properties at all. A
  `prefers-reduced-motion` media query in `tokens.css` zeroes every
  duration as a CSS-level belt-and-suspenders backstop alongside the JS
  `useReducedMotion()` gating (§6).

## 2. Responsive system

5-tier mapping onto Tailwind's REAL default breakpoints — no invented
breakpoint names:

| Tier | Tailwind prefix | Min width |
|---|---|---|
| mobile | (none — base) | 0 |
| tablet | `sm:` / `md:` | 640px / 768px |
| laptop | `lg:` | 1024px |
| desktop | `xl:` | 1280px |
| ultra-wide | `2xl:` | 1536px |

`src/config/breakpoints.ts` exposes the same pixel values as a JS constant
for any future JS-driven responsive logic (no consumer yet).
`components/layout/container.tsx` (max-width + responsive padding) and
`components/layout/grid.tsx` (column-count-per-tier convenience wrapper)
are the two standardized layout primitives — both use static Tailwind
class lookup tables, never template-string-constructed class names
(`` `grid-cols-${n}` ``), since Tailwind's compiler only detects literal
class strings in source.

## 3. Component library

**Approach:** the shadcn CLI (`pnpm dlx shadcn@latest add <name>`) for
every primitive with an official registry entry — Radix-based,
accessible by construction, matching `components.json` (already
configured in Phase 0). 24 components installed this way: `button`,
`input`, `textarea`, `checkbox`, `radio-group`, `switch`, `select`,
`breadcrumb`, `pagination`, `tabs`, `card`, `accordion`, `dialog`,
`drawer`, `popover`, `tooltip`, `badge`, `alert`, `sonner` (toast),
`progress`, `skeleton`, `avatar`, `table`, `carousel`, plus `label`
(a `form` dependency). New deps the CLI pulled in automatically:
`sonner`, `embla-carousel-react`, `vaul`.

**One registry item didn't work:** `shadcn add form` resolved with zero
files for this project's "radix-nova" style/CLI-version combination
(confirmed via `shadcn view form` — the registry entry exists, but
produces no files; `label`, installed immediately before/after via the
identical command shape, worked fine) — a CLI/registry quirk, not
something this phase caused. Hand-authored the standard shadcn RHF+Zod
Form set (`Form`/`FormField`/`FormItem`/`FormLabel`/`FormControl`/
`FormDescription`/`FormMessage`) directly in `components/forms/form.tsx`
instead, matching this codebase's own generated-component conventions
(`data-slot` attributes, the `radix-ui` consolidated import, function
components with direct `ref` props per React 19 — no `forwardRef`).

**Hand-built beyond shadcn's registry** (`components/ui/` unless noted):
`search-input.tsx`/`number-input.tsx`/`password-input.tsx` (thin `Input`
wrappers), `multi-select.tsx` (Popover + Checkbox list — deliberately
non-searchable, no `cmdk` dependency; a future combobox need is a new
component, not a rebuild of this one), `spinner.tsx`, `empty-state.tsx`/
`error-state.tsx` (generic, zero business copy — every string is a
prop), `stats-card.tsx`, `timeline.tsx`, `data-grid.tsx` (`Table` +
`@tanstack/react-table` for sort — the standard pairing; a new,
justified dependency), `icon.tsx` (§4), and `components/layout/
navbar.tsx`/`sidebar.tsx` (structural shells with content slots, zero
nav items — a future page composes its own links into them).

**Two required wiring additions**, flagged by the shadcn CLI itself and
added to the already-existing `providers/app-providers.tsx` (infra, not a
page): `TooltipProvider` (required for `Tooltip` to function) and
`<Toaster />` (sonner's render target, required for `toast()` calls to
render anything).

**Naming/variant conventions:** every component exposes variants via
`class-variance-authority`; `Button`'s existing shadcn variants
(default/secondary/ghost/outline/link/destructive × default/xs/sm/lg/
icon…) already satisfy the requested Primary/Secondary/Ghost/Outline/
Link/Icon set without any new component. `EmptyState`/`ErrorState`/
`StatsCard`'s titles use `<p>`/`<div>`, not a forced `<h1-6>` — matching
shadcn's own `CardTitle` (a `div`, not a heading), deliberately: these
appear inside arbitrary page sections that already own their own heading
hierarchy, and hard-coding a heading level here would risk breaking a
future page's document outline.

## 4. Form foundation

`components/forms/form.tsx` (§3). Usage pattern: RHF's `useForm()` +
`@hookform/resolvers`'s `zodResolver(schema)` (both already installed),
wrapped in `<Form {...form}>`, fields via `<FormField control={form.control}
name="..." render={...} />` → `FormItem` → `FormLabel` (+
`FormRequiredIndicator` for required fields) → `FormControl` → `input`/etc.
→ `FormDescription` (helper text) / `FormMessage` (validation error, reads
`fieldState.error.message` automatically). No business forms exist yet.

## 5. Icon system

`components/ui/icon.tsx` — one wrapper, `size` variant (`sm`/`md`/`lg`/
`xl` → `size-4/6/8/10`) via `cva`, `aria-hidden` by default (decorative
unless an explicit `label` prop is given, which switches it to
`role="img"` + `aria-label`). Consumers stop repeating `className="size-4"`
at every Lucide import site.

**Icon/Spinner scale — unified (Design System Cleanup, Round 2).**
`components/ui/spinner.tsx`'s `sm`/`md`/`lg` scale (`size-4/6/8`) is now
identical to `Icon`'s `sm`/`md`/`lg` (`Icon` adds one further `xl` tier,
`size-10`, that `Spinner` doesn't need). Resolved by changing `Icon`'s
definition, not `Spinner`'s: a full call-site audit found `Icon`'s `size`
prop has **zero real consumers** (every icon render in the codebase
bypasses the wrapper and renders the raw Lucide component directly with
an ad hoc `size-*` class), while `Spinner` has 6 live call sites including
the full-page loader (`app/loading.tsx`, `size="lg"`) and a section loader
(`(auth)/loading.tsx`, default `size="md"`). Changing `Icon` alone is
zero-visual-risk everywhere; changing `Spinner` would have shrunk both of
those loaders. **Separately still true:** the raw-Lucide-icon call sites
that bypass `Icon` entirely were not migrated onto the wrapper this
round — that's a real-but-separate cleanup (touches many call sites, no
scale inconsistency involved), left for a future pass.

## 6. Animation foundation

- `lib/animation/gsap.ts` — registers `ScrollTrigger` + `useGSAP` once,
  on import. Nothing imports it yet, so GSAP (~30kb) stays out of every
  route's bundle until a future page's component does.
- `lib/animation/tokens.ts` — `DURATION`/`EASE`/`GSAP_EASE` as plain JS
  constants, mirroring `tokens.css`'s motion tokens (necessary
  duplication — GSAP/Motion take numbers/arrays, not CSS custom
  properties).
- `lib/animation/use-reduced-motion.ts` — thin wrapper over `motion/
  react`'s `useReducedMotion()`. **Every** primitive below checks it and
  renders with animation fully collapsed (not just shortened) when true —
  CONTRIBUTING.md's "Respect reduced-motion" rule, applied literally.
- `components/motion/`: `fade.tsx`, `scale.tsx`, `slide.tsx` (on-mount by
  default, `inView` prop for scroll-triggered), `reveal.tsx` (a distinct
  clip-path wipe + rise effect, scroll-triggered by default — not a
  fade/slide re-skin), `stagger.tsx` (wraps each direct child in a
  staggered item — children stay plain JSX), `hover.tsx` (generic
  hover-lift), `magnetic-button.tsx` (cursor-following pull via
  `useMotionValue`/`useSpring`; wraps a native `<button>` — compose
  `components/ui/button.tsx`'s `Button` INSIDE it, don't restyle here),
  `ripple.tsx` (click-position expanding-circle feedback), `floating.tsx`
  (continuous idle loop — always off under reduced-motion, no static
  fallback makes sense for a loop), `text-reveal.tsx` (manual word-split +
  stagger — deliberately not GSAP's SplitText plugin, unnecessary for an
  effect this simple), `page-transition.tsx` (`AnimatePresence` keyed on
  `usePathname()` — not wired into any layout; a future `template.tsx`
  would use it, a page-level decision out of this phase's scope).
- `providers/smooth-scroll-provider.tsx` (Lenis) — built, **exported, and
  deliberately NOT mounted** in `app-providers.tsx`/`layout.tsx`. Smooth
  scroll is a per-experience choice (a marketing page might want it, a
  data-heavy portal screen might not); mounting it globally would impose
  its cost + behavior on every route before any page opts in, against
  `optimization.md`'s "marketing ships minimal JS" budget. A future layout
  wraps its own subtree: `<SmoothScrollProvider>{children}</SmoothScrollProvider>`.

**A real, documented TypeScript gotcha:** an unconstrained `as?:
React.ElementType` prop (used in `Container` and `TextReveal` for tag
polymorphism) breaks project-wide the moment `@react-three/fiber`'s types
are anywhere in the program — its global `JSX.IntrinsicElements`
augmentation widens generic `ElementType` resolution everywhere, not just
in files that import R3F. Confirmed by watching the exact error appear
the moment `@react-three/fiber` was installed (§7). Fixed by using a
closed tag union (`'div' | 'section' | ...`) instead of the open generic
in both places — also arguably more correct on its own terms (nobody
should render a `Container` as a `<span>`).

## 7. 3D foundation

`components/three/`: `scene-canvas.tsx` (thin `@react-three/fiber`
`<Canvas>` wrapper, DPR clamped to `[1,2]`, shadows off by default, an
in-canvas `Suspense` boundary whose fallback must be three.js-renderable
content — `null` by default, NOT an HTML component), `use-gltf-loader.ts`
(wraps Drei's `useGLTF` + its `preload`/`clear` static methods),
`environment.tsx` (Drei's `<Environment>` HDRI wrapper), `asset-loader.tsx`
(Drei's `<Loader>` — an HTML overlay driven by three.js's global loading
manager; **must render as a sibling of `<SceneCanvas>`, never inside it**
— Canvas children must be scene objects, not DOM elements; documented in
the file itself after getting the composition wrong once during
implementation and catching it before it shipped).

No scene, no mesh, nothing imports any of this yet. **Every future
consumer must load the whole subtree via `next/dynamic(() => import(...),
{ ssr: false })`** — WebGL cannot run during SSR — documented here and in
each file's own comment, not just asserted once.

## 8. Media foundation

`components/media/image.tsx` — wraps `next/image` (already handles AVIF/
WebP/responsive `srcset`/lazy-below-fold per `optimization.md`) with one
addition: an `aspectRatio` prop that reserves layout space (preventing
CLS) and defaults `fill` to `true` when set, without the caller computing
pixel dimensions. `components/media/video.tsx` — native `<video>`,
`IntersectionObserver`-gated `src` assignment (not just `preload="none"`,
which alone doesn't stop the browser from starting the network request on
render), `poster` required (no layout shift, always something meaningful
before decode), native `controls` by default (free keyboard
accessibility). No production assets, per restrictions.

## 9. Accessibility

Enforced per-component, not retrofitted — audited every hand-built
component against this list before considering Part 3b/6/7/8 done:

- **Focus ring**: every interactive primitive uses `--ring` (=
  `--accent`, verified ≥3:1 against both theme backgrounds, §1).
- **Keyboard operability**: real `<button>`s for the `PasswordInput`
  toggle, `DataGrid`'s sortable headers, `ErrorState`'s retry action, and
  `MagneticButton` (the magnetic pull is a mouse-only enhancement — Tab/
  Enter behave like a completely normal button, no keyboard regression).
- **Semantic HTML**: `Timeline` (`<ol>`/`<li>`/`<time>`), `Navbar`
  (`<header>`), `Sidebar` (`<aside>`/`<nav>`), `DataGrid` (real `<table>`
  via shadcn's `Table` primitives).
- **ARIA gaps found and fixed during this phase's own review** (not
  assumed correct on first pass): `MultiSelect`'s option `<li>`s gained
  `role="option"`/`aria-selected`; `DataGrid`'s sortable `<th>`s gained
  `aria-sort` (`ascending`/`descending`/`none`), which `@tanstack/
  react-table`'s own headless API doesn't set for you.
- **`prefers-reduced-motion`**: every `components/motion/*` primitive
  (§6) plus a CSS-level backstop in `tokens.css` (§1). `Spinner`'s
  `animate-spin` is a deliberate exception — a loading spinner conveys
  state, not decoration, and stopping it removes information rather than
  just motion (the same "essential animation" carve-out most design
  systems apply).
- **Dark-mode contrast**: re-verified with the same script as light mode,
  not assumed symmetric (§1's table has both columns).
- **Focus-visible gaps**: `breadcrumb.tsx`'s `BreadcrumbLink` had no
  focus-visible style at all — fixed (Design System Audit phase). Ring
  width was also inconsistently spelled (`ring-3` vs. `ring-[3px]` vs. a
  true `ring-2` outlier in `DataGrid`) — standardized to `ring-3`
  everywhere.

### Touch-target findings

Several interactive elements measure below the 44px WCAG 2.5.5/2.5.8
touch-target guideline. Fixing all of these by enlarging them would
visibly change the site, conflicting with "minimal visual change" — the
technique used instead, where it's safe, is **hit-slop**: an invisible
`before:absolute before:-inset-N before:content-['']` pseudo-element that
expands the *clickable* area without changing the *visible* box.

**Fixed (Design System Cleanup, Round 2):**
- Dialog close button (`components/ui/dialog.tsx`) — 28px visible
  (`icon-sm`), hit-slop (`before:-inset-2`) brings the clickable area to
  ~44px. Safe because it's a single, isolated instance with generous
  surrounding padding — no risk of overlapping an adjacent interactive
  element's hit zone.

**Documented, deferred — need live browser QA before touching:**

| Component | Current size | File | Why deferred |
|---|---|---|---|
| `Button` `icon-xs` | 24px (`size-6`) | `components/ui/button.tsx` | Shared variant — hit-slop here would inherit into every consumer, including tightly-packed ones (see `PaginationLink` below) |
| `Button` `xs` (height) | 24px (`h-6`) | `components/ui/button.tsx` | Same |
| `Button` `icon-sm` | 28px (`size-7`) | `components/ui/button.tsx` | Same |
| `Button` `sm` (height) | 28px (`h-7`) | `components/ui/button.tsx` | Same |
| `Select` trigger (`size=sm`) | 28px (`h-7`) | `components/ui/select.tsx` | Standalone form control, lower risk than Pagination, but not visually verified |
| `PaginationLink` (default) | 32px (`size-8`) | `components/ui/pagination.tsx` | Page-number buttons sit `gap-0.5` (2px) apart — hit-slop risks overlapping invisible hit zones between adjacent buttons (e.g. mis-clicking "4" when aiming for "3"), a correctness regression, not just visual |
| `Button`/`icon` (default) | 32px (`size-8`) | `components/ui/button.tsx` | Shared variant, same inheritance risk |
| `Button` `lg` / `icon-lg` (largest) | 36px (`h-9`/`size-9`) | `components/ui/button.tsx` | Shared variant, same inheritance risk |

Even the largest variant (36px) sits under 44px. A Phase 2 pass should
either give `Button` an opt-in hit-slop prop (so `PaginationLink` can
explicitly *not* take it) or redesign `Pagination`'s spacing to make
group-wide hit-slop safe — either way, it needs an actual browser to
click-test before shipping, which wasn't available this round.

## 10. Naming & import conventions

Inherited from `CONTRIBUTING.md` (not duplicated in full) —
`PascalCase.tsx` components, `kebab-case.ts` everything else. Specific to
this phase: shadcn-CLI-generated files keep the CLI's own exact output
style (double-quote strings, no semicolons in some files) rather than
being reformatted to this repo's Prettier config — they're
CLI-regenerated artifacts, not hand-maintained source, the same
"don't hand-format a generated file" precedent as
`apps/web/src/types/api/schema.ts` from the engineering-foundation phase.
Hand-built components follow this repo's normal Prettier/ESLint rules.

## 11. Remaining token/CSS findings (Design System Cleanup, Round 2 — documented, not fixed)

A second cleanup pass audited transitions, z-index, opacity, and
container widths for remaining hardcoded values. Fixed where the change
was value-preserving (see `--radius-full`, §1's spacing section, and the
`opacity-(--opacity-disabled)` wiring above); the following were found
but deliberately **not** changed, because fixing them would be a real
behavioral/visual shift I couldn't verify without a live browser:

- **`duration-100`** on 7 Radix overlay/menu components (`dialog`,
  `alert-dialog`, `select`, `popover`, `dropdown-menu`) doesn't match any
  defined duration token (nearest is `--duration-fast` at 150ms). Wiring
  it would add 50ms to every dialog/dropdown/select open animation — a
  real timing change, not a canonicalization.
- **Raw `z-50`/`z-10`** on ~13 Radix overlay components (dialog,
  alert-dialog, drawer, select, dropdown-menu, popover, tooltip, avatar)
  bypass the named `--z-*` scale that `navbar.tsx`/`portal-header.tsx`/
  root `layout.tsx` already use (`z-(--z-sticky)` = 1100,
  `z-(--z-toast)`). Migrating these to `--z-modal`/`--z-popover`/etc.
  (1300-1600) is a large numeric jump that could change stacking relative
  to the sticky navbar in ways that need an actual click-test, not
  reasoning from source.
- **`--space-gap-sm/md/lg`** (3 of the original 6 spacing tokens) remain
  unwired — no single "gap" convention emerged the way section-padding
  did (`--space-section-y[-lg]`, now wired) or card-padding did
  (`--space-card-padding`, now wired). Forcing a wiring onto one arbitrary
  `gap-4` site wouldn't be a real fix.
- **`--motion-scale`** has zero consumers, but its own comment explains
  why: reduced-motion is enforced entirely in JS
  (`useReducedMotion()`), and this token is reserved for a future
  CSS-level use case, not leftover dead code. Not removed.
- **`Container`'s content-width gap**: 13+ pages apply raw
  `max-w-2xl`/`xl`/`3xl` (content-reading widths) either standalone or as
  a className override on `Container`, because `Container`'s own `size`
  variant only offers page-level `max-w-screen-*` widths. A real, genuine
  gap in the component's API — fixing it needs a new variant tier (a
  naming decision) plus migrating 13+ call sites, too large for an
  incremental round.
