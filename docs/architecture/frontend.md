# Frontend Architecture (apps/web)

Covers the frontend engineering foundation only — tooling, structure, API
typing, providers, state, error/loading architecture. No pages, components,
design system, or auth UI exist yet; see `docs/implementation/progress.md`
for what phase builds those next.

## Stack

Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS v4,
shadcn/ui + Radix (installed and configured via `components.json`, zero
components built yet — deliberately deferred to the Design System phase),
TanStack Query + Zustand, React Hook Form + Zod, Lucide React, pnpm.
Nothing beyond what's in this list was added — see CONTRIBUTING.md and this
phase's own restriction against "unnecessary libraries."

## Folder structure

```
src/
  app/            Next.js App Router. Route groups: (marketing) SSG/ISR,
                  (portal) SSR/auth-gated, (auth) public auth pages —
                  see "Routing" below. app/api/ is Next.js Route Handlers
                  (BFF layer), NOT the real backend.
  components/     UI primitives/layout/feature groups — empty scaffold,
                  Design System phase.
  features/       Colocated feature modules (components+hooks+API calls
                  per feature) — empty, no business modules yet.
  hooks/          Shared React hooks — empty scaffold.
  lib/            Framework-adjacent glue: lib/utils.ts's cn() (required
                  by shadcn's components.json alias), lib/seo/, lib/errors/.
  services/       services/api/ — the built API client layer (below).
                  services/auth/, services/analytics/ — empty scaffolds.
  providers/      Global React providers (Query, Theme, Error Boundary),
                  composed in app-providers.tsx, wired into app/layout.tsx.
  store/          Zustand infrastructure (create-store.ts) + conventions.
                  No feature stores yet.
  styles/         Design tokens (tokens.css, components.css) — empty,
                  Design System phase; Tailwind v4 theme lives in
                  app/globals.css's @theme block until then.
  types/          types/api/schema.ts (generated, see below) + hand-written
                  shared types (types/errors.ts).
  utils/          Generic, framework-agnostic helpers — see "lib vs utils"
                  below.
  constants/      Folded into config/ — see below; no separate directory.
  config/         Centralized configuration — env, app, api, routes,
                  feature-flags, metadata.
public/
  fonts/ images/ icons/ videos/ models/ animations/   No production
                  assets yet.
```

### `lib/` vs `utils/`

Both exist, deliberately not merged. `lib/utils.ts` holds `cn()` because
shadcn/ui's CLI hardcodes `@/lib/utils` as the import path in every
component it generates (`components.json` → `aliases.utils`) — moving it
would break that convention for every future `pnpm dlx shadcn add`. Every
other framework-agnostic helper (dates, currency, numbers, URLs, storage)
goes in `utils/` instead. Rule of thumb: if shadcn or Next don't dictate
the path, it belongs in `utils/`.

## Naming & import conventions

Inherited from `CONTRIBUTING.md` — not duplicated here in full. Key points
that apply specifically to this app: `PascalCase.tsx` for components,
`kebab-case.ts` for everything else, `kebab-case` directories, one-way
dependency flow (UI → services → API), marketing and portal route groups
never cross-import, shared validation schemas (Zod) are the source of
truth for a given shape rather than re-declared per form.

## Environment configuration

`.env.local.example` documents every variable. `src/config/env.ts`
validates `process.env` through two Zod schemas at import time —
`clientEnv` (only `NEXT_PUBLIC_*`, safe in client components) and
`serverEnv` (adds server-only vars). Importing `serverEnv` from a client
component fails loudly at build/import time rather than silently
resolving `undefined`, by design. `.env.local` stays gitignored.

## OpenAPI type generation

The real backend API is frozen (Backend v1.0). Frontend types are
generated directly from it, never hand-duplicated:

```bash
pnpm generate:api-types
```

This runs two steps (also runnable independently):
1. `pnpm --filter @antrique/api generate:openapi` — boots the real
   `AppModule` and writes `apps/api/openapi.json` (requires the API's
   `DATABASE_URL` to be reachable).
2. `pnpm --filter @antrique/web generate:api-types` — runs
   `openapi-typescript` against that file, writing
   `apps/web/src/types/api/schema.ts` (committed, header-marked
   auto-generated — regenerate, don't hand-edit).

**Known limitation, inherited from the backend, not fixed here:** every
response DTO currently serializes with empty JSON-schema detail
(`{ type: 'object', properties: {} }`) — the Swagger CLI plugin can't
introspect the backend's constructor-parameter-property DTOs (see Backend
v1.0 Review Phase 4 in `docs/implementation/progress.md`). Request bodies
ARE fully typed from the generated schema. Response typing in
`services/api/request.ts` uses an explicit `<T>` type argument at the call
site until that backend limitation is addressed.

## API foundation (`services/api/`)

`client.ts` (public surface: `apiClient.get/post/put/patch/delete`) →
`request.ts` (generic fetch wrapper, timeout, JSON handling) →
`http-error.ts` (`ApiError`, matching the backend's real
`{ statusCode, message, error }` shape) + `interceptors.ts` (empty
request/response interceptor pipeline — the seam a future auth phase
attaches a token/refresh interceptor to, without changing `request.ts`).

## Global providers

`providers/app-providers.tsx` composes, outermost to innermost:
`GlobalErrorBoundary` (class component — React requires this, no hook
equivalent) → `ThemeProvider` (next-themes) → `QueryProvider` (TanStack
Query, one `QueryClient` per component instance per the App Router SSR
guidance). Wired into `app/layout.tsx` around `{children}`.

## State management

`store/create-store.ts` wraps Zustand's `create` with dev-only Redux
DevTools wiring. See `store/README.md` for the Zustand-vs-TanStack-Query
decision rule (client/UI state → Zustand; server state → Query, never
both) and store conventions. No feature stores exist yet.

## Routing

Route groups already scaffolded: `(marketing)`, `(portal)` (both
pre-existing, empty subfolders per planned page), `(auth)` (added this
phase). `app/api/` holds future Next.js Route Handlers (BFF concerns —
session cookies, webhooks) — distinct from the real backend API. None of
these have real pages yet; `src/config/routes.ts` holds the path constants
reserved for each.

## Error & loading architecture

`app/error.tsx` (route-segment boundary), `app/global-error.tsx` (root
layout crashes only), `app/not-found.tsx` (404), `app/loading.tsx` (root
Suspense fallback) — all plain semantic HTML + Tailwind utilities, no
shadcn primitives, since this phase builds infrastructure, not a design
system. `src/types/errors.ts` defines a `NormalizedError` discriminated
union (`api | network | unexpected`); `src/lib/errors/normalize-error.ts`
classifies any caught value into it, consumed by both the error boundary
and (eventually) API call sites.

**Skeleton convention (documented, not built):** once the Design System
phase adds real components, loading skeletons should be colocated
`*.skeleton.tsx` files per feature/component, styled with Tailwind's
`animate-pulse` utility over a `bg-muted`-token background — not a single
generic `<Skeleton>` primitive reused everywhere, since skeleton shape
should mirror the real content's layout.

## Architectural decisions log

- **shadcn/ui installed but unused this phase.** Tooling only
  (`components.json`, `cn()`); zero `components/ui/*` files, per this
  phase's explicit restriction against building "Components"/"Design
  System."
- **Generated API types are committed**, not gitignored — lets the
  frontend typecheck/build without the backend running; regenerate on
  demand when the API contract changes (it won't, while frozen).
- **`env.ts` splits client/server schemas** rather than one combined
  schema, to make the client/server import boundary a compile-time-visible
  mistake instead of a silent `undefined`.
- **No test framework added.** Out of scope for this phase's task list;
  `apps/web/tests/` remains an empty scaffold.
