# Frontend — Next.js (marketing SSG/ISR + authenticated portal)

Two workloads, one Next.js app: the indexable marketing site (SSG/ISR) and the
authenticated client portal (SSR). They must never cross-import — see
`CONTRIBUTING.md` §2 and `docs/architecture/architecture.md`.

## Run

```bash
cp .env.local.example .env.local   # from the repo root: apps/web/.env.local.example
pnpm --filter @antrique/web dev      # watch mode, http://localhost:3000
pnpm --filter @antrique/web build    # production build (standalone output)
pnpm --filter @antrique/web start    # run the production build
pnpm --filter @antrique/web lint
pnpm --filter @antrique/web typecheck
pnpm generate:api-types               # regenerate src/types/api/schema.ts from the live backend
```

Or via Docker Compose from the repo root: `docker compose up web`.

## Structure

```
src/
  middleware.ts     Session presence/expiry redirect for portal/auth paths
  app/
    (marketing)/    SSG/ISR route group — indexed. Real site: Home, Services,
                    Industries, Work, About(+Process), Pricing, Resources,
                    Blog (listing + [slug] detail), FAQ, Contact, Quote
                    (NOINDEX), Privacy, Terms — see
                    docs/architecture/marketing-site.md.
    (portal)/       SSR route group — auth-gated, never indexed. layout.tsx
                    (redirects without a session, composes PortalShell),
                    error.tsx, loading.tsx. The real business portal — all
                    7 Backend v1.0 modules: dashboard (landing hub),
                    catalog (+ [id] detail), bespoke/customize/[productId]
                    (order-creation wizard), orders (+ [id]), inventory
                    (+ transactions/warehouses/suppliers), crm (leads/
                    follow-ups/customers), billing (invoices/payments),
                    admin (dashboard/notifications/audit-logs/reports) —
                    see docs/architecture/business-portal.md.
    (auth)/         Public auth pages — layout.tsx (centered card, redirects
                    away if already authenticated). login/ (real — email +
                    password, expired-session messaging). No signup/
                    password-reset — the real backend has no such endpoints.
    api/auth/       Next.js Route Handlers (BFF layer) — login/session/
                    refresh/logout. Owns the httpOnly session cookie; the
                    real backend (apps/api) never sees it (Bearer-only).
    api/{contact,quote}/  Validated, logged placeholder lead-capture seam —
                    no real CRM endpoint exists yet (Sprint 3 scope).
    layout.tsx (skip link), error.tsx, global-error.tsx, not-found.tsx,
    loading.tsx, robots.ts, sitemap.ts
  components/
    ui/             shadcn/Radix primitives + hand-built ones, now
                    including command.tsx/input-group.tsx (command palette),
                    alert-dialog.tsx (hand-authored — destructive confirms)
    data/           resource-table.tsx, use-list-params.ts, list-toolbar.tsx,
                    list-pagination.tsx, status-badge.tsx,
                    detail-page-header.tsx, module-sub-nav.tsx,
                    enum-filter-select.tsx — the shared list/detail
                    abstraction every business module's page is built on
    layout/         Container, Grid, Navbar, Sidebar, Footer — structural
                    shells only, no business nav
    navigation/     NavLink (active-route detection), DesktopNav, MobileNav
                    (Drawer-based) — the reusable nav system
    portal/         PortalShell, PortalHeader, Breadcrumbs, UserMenu,
                    NotificationCenter, CommandPalette — the application shell
    forms/          RHF+Zod form wrapper set (form.tsx)
    motion/         GSAP/Motion animation primitives
    three/          React Three Fiber wrappers — no scenes
    media/          Image, Video wrappers
    marketing/      Real marketing compositions built from components/ui —
                    hero/page-hero, section-heading, service/industry/
                    pricing/blog cards, process-steps, tech-stack-strip,
                    stat-strip, cta-band, site-nav (mega menu), site-footer
    seo/            json-ld.tsx — renders lib/seo/schema.ts's builders
  features/         Colocated feature modules — catalog/, bespoke/, orders/,
                    inventory/, crm/, billing/, admin/, customers/ (api/
                    + hooks/ per module, thin wrappers over services/api/
                    client.ts + TanStack Query)
  hooks/            Shared React hooks — empty scaffold
  content/          Hand-authored marketing content (services, industries,
                    process, tech stack, engineering stats, pricing tiers,
                    FAQs, blog posts) — not a CMS yet, see content/README.md
  lib/
    auth/           jwt.ts (decode-only), session-cookie.ts (server-only
                    cookie read/write), tenant.ts (X-Tenant-ID resolution),
                    no-store-response.ts (Cache-Control: no-store JSON
                    helper for the token-bearing BFF responses),
                    backend-auth-client.ts (server-to-server calls to
                    apps/api via API_INTERNAL_URL)
    query/          query-keys.ts (factory) + README (conventions)
    validation/     contact.ts/quote.ts/auth.ts — Zod schemas shared between
                    client forms and their BFF route handlers
    seo/            seo.config.ts/schema.ts (spec, prior phase) + metadata.ts
                    (RouteMeta → real Next Metadata bridge)
    utils.ts (cn(), shadcn alias), errors/{normalize-error,error-copy}.ts
                    (error-copy maps a normalized error to display copy —
                    401/403/404/5xx/network — for route-level error.tsx),
    animation/ (gsap registration, motion tokens, useReducedMotion)
  services/
    api/            Typed fetch client — now with a 401-refresh-and-retry
                    path and a GET-only network/5xx backoff retry, plus the
                    auth/tenant header request interceptor
    auth/           auth.service.ts — client for this app's own BFF routes
    analytics/      empty scaffold
  providers/        Global providers (Query, Theme, Error Boundary, Auth,
                    Tooltip, Toaster) + smooth-scroll-provider.tsx (Lenis —
                    unmounted by default, opt-in)
  store/            Zustand infrastructure + conventions. Cross-cutting
                    stores: auth-store.ts, ui-store.ts (persisted sidebar
                    state), notification-store.ts (mocked)
  styles/           tokens/tokens.css (real "warm antique" palette,
                     contrast-verified), tokens/components.css
  types/            api/schema.ts (generated — confirmed useless for field
                    typing, every DTO is Record<string, never>), api/
                    common.ts + {catalog,bespoke,orders,inventory,crm,
                    billing,admin,customers}.ts (hand-authored from the
                    real apps/api DTO source), errors.ts, navigation.ts
  utils/            Generic helpers: date, currency, number, url, storage
  config/           env, app, api, routes (now includes every real portal
                    path), feature-flags, metadata, breakpoints, navigation
                    (real PORTAL_NAV_ITEMS — Catalog/Orders/Inventory/CRM/
                    Billing/Admin/Dashboard), query (QueryClient defaults)
```

See `docs/architecture/frontend.md` for the engineering-foundation writeup,
`docs/architecture/design-system.md` for the design system,
`docs/architecture/application-runtime.md` for the application shell/auth/
API runtime, `docs/architecture/marketing-site.md` for the real public
marketing site, and `docs/architecture/business-portal.md` for the real
authenticated business portal (all 7 Backend v1.0 modules) built on top of
all three.
