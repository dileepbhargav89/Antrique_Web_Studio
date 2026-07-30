# Marketing Website (`apps/web`, `(marketing)` route group)

The public, SEO-indexed marketing site — built on top of the Frontend
Engineering Foundation (`frontend.md`), Design System (`design-system.md`),
and Application Runtime Architecture (`application-runtime.md`) phases, all
frozen. No portal/business CRUD here.

## 1. Site structure

15 real routes under `app/(marketing)/`:

```
/                    Home
/services            Services hub (4 clusters, 15 services)
/industries           Industries hub (10 industries)
/work                 Portfolio ("Work" — honest early-stage framing)
/about                About
/about/process        Process detail (already reserved in sitemap.ts)
/pricing              Pricing (scope-tiered, no fixed figures)
/resources             Resources hub (→ Blog, FAQ)
/blog                 Blog listing
/blog/[slug]          Blog detail (static params from content/blog-posts.ts)
/faq                  FAQ
/contact              Contact form
/quote                Quote request wizard (NOINDEX)
/privacy               Privacy Policy
/terms                Terms of Service
```

Plus the root `not-found.tsx` (already built in the Application Runtime
Architecture phase) for 404s. IA/navigation/CTA-strategy source: the real
Information Architecture content — despite the filename bug (a separate,
already-tracked blocker, see `docs/implementation/blockers.md`) — lives in
`docs/product/06-client-dashboard.md`.

## 2. Content-honesty decision (confirmed with the user)

Antrique is pre-launch (`docs/product/01-discovery.md`'s real Vision
content, despite the filename: "0–6mo: market presence & pipeline" — no
real clients yet). Sections that would normally show client social proof
use **honest early-stage framing** instead of fabricated content:

- **No testimonials anywhere.** No `content/testimonials.ts` exists.
- **`/work` (Portfolio)** frames around capabilities and process, with an
  explicit "case studies coming soon" empty state — not fake case studies.
- **Home's "Statistics" section** (`content/engineering-stats.ts`) cites
  real, verifiable facts about this actual platform (test suite count,
  coverage, accessibility baseline, architecture) instead of invented
  client-traction numbers.
- **`/pricing`** (`content/pricing-tiers.ts`) shows scope-differentiated
  tiers with no fabricated exact figures — every tier ends in "Get a
  Quote," matching the real CTA-strategy doc's own "Get a Quote —
  persistent" primary-CTA model, not an invented price list.
- **`/contact`** deliberately does not emit `localBusinessSchema` — that
  builder needs real NAP (name/address/phone) data that doesn't exist;
  fabricating an address would misrepresent a real business location.

## 3. Lead-capture forms are a real, honestly-labeled placeholder

`/contact` and `/quote` both submit to new Route Handlers
(`app/api/contact/route.ts`, `app/api/quote/route.ts`) that validate (Zod,
schemas shared with the client forms via `lib/validation/{contact,quote}.ts`)
and **log server-side** — there is no real backend CRM/lead-capture
endpoint yet (Sprint 3 scope, per `docs/product/07-roadmap.md`'s real
content). This matches this codebase's own established "capability exists,
first real consumer comes later" pattern rather than faking a CRM
integration. **Flagged as a pre-launch gap in §9 below** — submissions are
not actually persisted or emailed anywhere yet.

`/quote` implements the real quote-wizard spec (despite the filename,
found in `docs/product/05-admin-dashboard.md`): one question per screen
(`app/(marketing)/quote/quote-wizard.tsx`), visible progress (`Progress`),
per-step validation via `form.trigger(step.fields)` that never discards
already-entered data, contact fields captured last, and submission only on
explicit user action (no auto-submit).

## 4. Content data layer (`src/content/`)

Plain TypeScript data — not a CMS (that's Sprint 6 scope). Every file is
shaped so a future CMS-backed fetch can replace it as a drop-in. See
`content/README.md`. Services (15/4 clusters) and industries (10) aren't
enumerated anywhere in the product docs — derived reasonably from the
documented cluster names and the real persona list.

## 5. Reused design-system/animation/media (zero duplicate primitives)

`components/marketing/*` composes existing `components/ui/*` primitives —
no new base primitives except `components/seo/json-ld.tsx` (a 6-line
`<script>` wrapper) and the shadcn `command`/`input-group` additions from
the prior phase. Notably: the "mega menu" (`site-nav.tsx`) is built on the
existing `DropdownMenu` primitive, not a new `NavigationMenu` — a
functionally equivalent wide, grouped, click-triggered panel without
introducing a component the design system doesn't already have.

Motion: `TextReveal` (headings), `Stagger` (grids), `Reveal`/`Fade` (scroll/
step transitions), `Hover` (card lift) — all already respect
`prefers-reduced-motion` internally (verified, not re-implemented).
`MagneticButton` deliberately isn't used: every CTA in this site is a real
navigational `<Link>`, and `MagneticButton` wraps a native `<button>` —
nesting a `<Button asChild><Link></Button>` inside it would nest an `<a>`
inside a `<button>`, invalid HTML. `Hover` + `Button`'s own built-in states
cover the same interaction need without that risk.

3D: `components/marketing/hero-scene.tsx` — a purely decorative rotating
wireframe icosahedron (primitive geometry, no GLTF models — none exist),
the first real consumer of `components/three/scene-canvas.tsx`. Dynamically
imported (`ssr:false`, required — WebGL can't render server-side), skipped
entirely under reduced motion, and never rendered below the `lg`
breakpoint. Never load-bearing: the hero is fully functional with it absent.

## 6. SEO implementation

`lib/seo/metadata.ts` (new) bridges the already-specified `RouteMeta`
contract (`seo.config.ts`, built in an earlier phase but never wired to a
real `generateMetadata` call) to real Next.js `Metadata` — canonical,
Open Graph (website/article), Twitter card, robots. Every page calls
`buildPageMetadata()`. `config/metadata.ts` (root layout default) now
derives its title template/description from `seo.config.ts`'s `SITE`
constant instead of a second, differently-formatted copy.

JSON-LD (`lib/seo/schema.ts`'s existing builders, rendered via the new
`<JsonLd>` component) per `SCHEMA_BY_PAGE`: Organization + WebSite (Home),
BreadcrumbList (every page except Home and top-level hubs — the real IA
doc's own rule), FAQPage (FAQ, Pricing's mini-FAQ), BlogPosting (blog
posts). `/quote` is `NOINDEX` (already reserved in `NOINDEX_ROUTES`/
`robots.ts`). `sitemap.ts`'s `STATIC_ROUTES` already listed every real path
this phase builds — unchanged.

## 7. Accessibility

One `<h1>` per page (`PageHero`/`HomeHero`, both built on `TextReveal`).
Breadcrumbs only where the IA doc specifies (deeper pages, not hubs).
Multi-step quote wizard moves focus to each new step's first field on
advance (`useEffect` + `querySelector`, since the browser has no default
behavior for a step that appears without a real navigation). Every form
field uses the shared `Form`/`FormField`/`FormLabel`/`FormMessage` set
(`components/forms/form.tsx`, built in an earlier phase) for correct
label/error association. Skip link + `id="main-content"` already global.

## 8. Performance

`CommandPalette`-style lazy loading pattern reused for the 3D hero element
(`next/dynamic({ssr:false})`) — the only genuinely heavy, non-essential
piece on the site. All internal navigation uses `next/link`. Blog detail
pages are fully static (`generateStaticParams`, no runtime data fetch —
content is code, not a CMS yet). Service/industry cards deliberately don't
link to nonexistent detail pages (no dead links, no wasted prefetch
targets).

## 9. Risks / recommendations

- **Contact/Quote submissions aren't actually persisted anywhere yet** —
  the Route Handlers validate and log server-side only. Before real
  launch, wire these to a real CRM/email service (Sprint 3) or submissions
  are silently lost.
- **Services (15) and industries (10) are derived, not sourced** — no
  product doc enumerates their real names. If the business defines a
  different actual service/industry list, `content/services.ts`/
  `industries.ts` need a real content pass, not just a copy edit (some
  names may map to genuinely different clusters).
- **No detail pages for individual services/industries** — `ServiceCard`/
  `IndustryCard` deliberately don't link anywhere per-item, all pointing
  at their hub. Building the real ×15/×10 templates is explicitly future
  scope (Sprint 2's own original roadmap entry), not silently done here.
- **Pricing has no real figures** — by design (see §2), but the business
  will eventually need to decide actual numbers or confirm the
  quote-only model is permanent.
- **`docs/product/*` filename/content mismatch is unresolved** (a
  pre-existing, separately tracked blocker — see
  `docs/implementation/blockers.md`) — this phase worked around it by
  reading past the mismatch, not fixing it.
- **No real branded assets exist** (`public/og/default.png`, `/logo.png`,
  a real favicon beyond the new placeholder `app/icon.svg` monogram) — see
  §10 below; `buildPageMetadata`/`schema.ts` were fixed to not reference
  the nonexistent ones, but a real share image and logo are still a
  pre-launch asset gap.
- **`SITE.twitter` (`@antrique`, `seo.config.ts`) is unverified** — unlike
  the logo/OG-image/search-route references (objectively confirmed
  nonexistent this review), whether this is a real, owned handle isn't
  something the codebase can confirm either way. Verify before launch;
  don't assume it's correct just because it was left untouched.
- **`components/forms/form.tsx`'s `FormMessage` uses `text-destructive`
  directly on `--background`** (inline field-error text, first exercised
  live by this phase's Contact/Quote forms) — `design-system.md`'s
  contrast table only verifies `destructive-foreground`/`destructive` (text
  ON a destructive surface), not bare `destructive` as body text. Very
  likely passes 4.5:1 given `--destructive`'s lightness value, but this
  review could not run the actual OKLCH→WCAG verification script (no
  shell access) to confirm, and the component predates this phase — flagged
  for a real verification pass rather than changed speculatively.

## 10. Engineering Review (2026-07-26)

A full review pass — modeled on the Backend v1.0 Review phases — covering
IA, responsive, design-system reuse, animation, 3D/media, SEO,
accessibility, performance, code quality, and content. Real issues found
and fixed:

- **Content duplication**: `/work` repeated the full service-cluster card
  grid and process timeline, both already on Home/Services/About-Process.
  Trimmed to its own real content (the honest capabilities/case-studies
  framing) with links out instead of copy-pasted sections.
- **Broken Open Graph/Twitter images on every page**: `buildPageMetadata`
  defaulted to `SITE.ogImageDefault` (`/og/default.png`), a path with no
  real file behind it (confirmed via direct filesystem check) — every
  social share of every page would have shown a broken image. Fixed to
  only emit an `images` field when a real path is supplied.
- **Broken JSON-LD image/logo/search references**: `organizationSchema()`
  emitted `logo: '.../logo.png'` (doesn't exist) and an empty `sameAs: []`;
  `websiteSchema()` emitted a sitelinks `SearchAction` targeting `/search`
  (no such route exists); `blogPostingSchema()`'s `publisher.logo` pointed
  at the same nonexistent `logo.png`. All four fixed to omit the
  unavailable field rather than assert something false.
- **No favicon anywhere in the app** — added `app/icon.svg` (a simple
  monogram using the already-established brand tokens), the one asset this
  review could create directly (SVG is authorable as text; a raster PNG
  isn't, no image tool available).
- **WCAG AA contrast failure**: `SectionHeading`'s eyebrow label used
  `text-accent`, a pairing `design-system.md`'s own table verifies only at
  the 3:1 non-text/focus-indicator threshold (3.30:1 in light mode) — not
  the 4.5:1 normal-text threshold small label text actually needs. Fixed
  to `text-muted-foreground` (verified ≥4.5:1 in both themes).
- **Missing accessible name on the quote wizard's progress bar** — added
  `aria-label` reflecting the current step.
- **Unnecessary background rendering**: the 3D hero's WebGL canvas and
  per-frame rotation loop kept running after being scrolled past. Fixed
  with the same IntersectionObserver-gated lazy-mount pattern
  `components/media/video.tsx` already established, unmounting the canvas
  entirely when out of view.
- **Metadata/content mismatch**: `/resources`'s description promised
  "guides," a content type that doesn't exist on the page (only Blog/FAQ
  do). Fixed the description to match reality.
- **Inconsistent stagger timing**: Home hero's CTA `Stagger` passed an
  explicit `staggerDelay={0.1}` while every other `Stagger` on the site
  used the shared default (`0.08`). Removed the override for consistency.

Verified, not changed (already correct): client/server component
boundaries (only 3 of ~15 marketing components are `'use client'`, exactly
the ones that need it); no heavy dependencies (GSAP, Carousel/embla)
pulled into the marketing bundle; zero circular dependencies (`content/`
never imports from `components/`); no unused imports found in a full
manual read-through; spacing/grid/breakpoint patterns consistent page to
page; no dead links (`<a href>` audit came back empty — internal nav is
100% `next/link`); no `MagneticButton` usage (confirmed still zero,
avoiding the invalid-HTML nesting risk documented in §5); no fabricated
testimonials/stats/pricing figures/lorem-ipsum anywhere (re-verified via a
full-tree text search).

**Validation status — not clean, and stated plainly:** the tool-execution
outage first noted during the Application Runtime Architecture phase
persisted through this entire review — `typecheck`/`lint`/`prettier`/
`build`/Lighthouse could not be run at all. Every fix above was verified
by direct code reading and, where possible, direct filesystem checks (the
missing image assets were confirmed by attempting to read them, not
assumed) — but none of it has been through the real toolchain yet. This is
the single most important remaining item before Phase 3.
