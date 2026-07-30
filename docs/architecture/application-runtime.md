# Application Runtime Architecture (`apps/web`)

The frontend application shell every future business page/feature renders
inside — routing, layouts, the portal application shell, navigation,
authentication, the API runtime, query conventions, cross-cutting state,
error/loading architecture, accessibility, and performance. Built on top of
the Frontend Engineering Foundation (`docs/architecture/frontend.md`) and
Design System (`docs/architecture/design-system.md`) phases, both frozen —
nothing from either is redone here. No business pages, no login/signup
forms, no permissions, no feature stores — out of scope for this phase.

## 1. Route architecture

The four route groups scaffolded by the Foundation phase stay exactly as
they were: `(marketing)` (SSG/ISR, indexed), `(portal)` (SSR, auth-gated),
`(auth)` (public), and `api/` (Next.js Route Handlers — a BFF layer, not the
real backend). Each now has a real `layout.tsx` (§2) and `error.tsx`/
`loading.tsx` (§9/§10). `config/routes.ts` remains the single source of
truth for every path — `middleware.ts` and the layouts derive from it
(`Object.values(ROUTES.portal)`/`ROUTES.auth`) rather than duplicating path
lists.

## 2. Layouts

- **`app/(marketing)/layout.tsx`** — Server Component. `Navbar` (existing
  shell, empty nav slot) + `Footer` (new, same structural-shell pattern as
  `Navbar`/`Sidebar` — slots only, no business links) + `{children}`.
- **`app/(portal)/layout.tsx`** — Server Component. Reads the session
  cookie (`lib/auth/session-cookie.ts`) and redirects to `/login` if
  absent/expired — defense-in-depth alongside `middleware.ts` (§5). Composes
  `components/portal/portal-shell.tsx` (§3).
- **`app/(auth)/layout.tsx`** — Server Component. Minimal centered-card
  shell; redirects to `/dashboard` if a valid session already exists.
- Root `app/layout.tsx` gained a skip-to-content link (`href="#main-content"`,
  `sr-only` until focused) ahead of `<AppProviders>`; every layout's main
  landmark carries `id="main-content"`.

## 3. Application shell (`components/portal/`)

- **`portal-shell.tsx`** — top-level composition: the existing `Sidebar`
  shell (desktop, `hidden lg:flex`, collapsed state from `store/ui-store.ts`)
  + `PortalHeader` + `{children}` + compact `Footer`. Owns the lazy
  (`next/dynamic`, `ssr: false`) import of `CommandPalette` (§12).
- **`portal-header.tsx`** — mobile nav trigger (`MobileNav`), sidebar
  collapse toggle, `Breadcrumbs`, a command-palette trigger styled as a
  search box (see the deviation note below), `NotificationCenter`,
  `UserMenu`.
- **`breadcrumbs.tsx`** — built from `usePathname()`, not a per-page prop,
  using the already-built `components/ui/breadcrumb.tsx` primitives.
  Segment labels come from `config/navigation.ts` where available; a deeper
  segment (a future business page's own sub-route) falls back to a
  title-cased version of the URL segment.
- **`user-menu.tsx`** — session `email` (from `store/auth-store.ts`, the
  only user data the backend currently exposes — see §5's `/me` gap) +
  "Log out," the one real, fully-wired auth action this phase ships.
- **`notification-center.tsx`** — mocked (`store/notification-store.ts`
  seeds empty), distinct from `sonner`'s toast queue.
- **`command-palette.tsx`** — mocked static entries from
  `config/navigation.ts`, built on shadcn's `command.tsx` (added via
  `pnpm dlx shadcn add command`; `cmdk` was already installed) wrapping the
  existing `Dialog`.

**Deviation from the original brief's "global search placeholder":** the
header's search element is a `Button` styled to look like a search field,
not a real `<input>`. An actual input that accepts typing but does nothing
with it would be more misleading than a clearly-a-trigger button — clicking
it (or `⌘K`/`Ctrl+K`) opens the command palette, which is the real
placeholder surface.

## 4. Navigation system (`components/navigation/`)

- **`nav-link.tsx`** — the one place active-route detection lives
  (`usePathname` + prefix match for nested routes, `aria-current="page"`).
  Every other nav surface renders through this rather than re-implementing
  the check.
- **`desktop-nav.tsx`** — renders inside `Sidebar`'s children slot.
  `collapsed` hides labels visually (`sr-only`), keeping them in the DOM for
  assistive tech rather than removing them.
- **`mobile-nav.tsx`** — a `Drawer`-based (vaul) trigger, `lg:hidden`. The
  desktop/mobile split is pure Tailwind (`hidden lg:flex` / `lg:hidden`),
  deliberately not a JS breakpoint hook — `config/breakpoints.ts` has no
  consumer and doesn't need one for this.
- Nav items come from `config/navigation.ts` (`PORTAL_NAV_ITEMS`) — mocked,
  no permission gating (out of scope; see Risks).

## 5. Authentication architecture

### The constraint that shapes everything below

`apps/api` is strictly Bearer-token-authenticated: its CORS config sets
`credentials: false` (comment: "this API is Bearer-token-authenticated,
never cookie-based"), and `JwtAuthGuard` only ever reads
`Authorization: Bearer <token>` — never a cookie. So an httpOnly session
cookie is a concept this Next.js server owns entirely; the real backend
never knows it exists. Two prior-phase env vars were reserved for exactly
this: `API_INTERNAL_URL` (server-to-server calls) and
`SESSION_COOKIE_NAME=antrique_session` (the cookie itself).

### Session cookie (`lib/auth/session-cookie.ts`, server-only)

One httpOnly cookie, value `JSON.stringify({ accessToken, refreshToken })`
— both already-signed backend JWTs, so the cookie needs no extra encryption
beyond `httpOnly` + `Secure` (production) + `SameSite=lax`. `maxAge` is a
frontend constant mirroring the backend's `JWT_REFRESH_TOKEN_TTL` default
(30 days) — see Risks for the drift this can't detect.

### BFF routes (`app/api/auth/*/route.ts`)

Each calls the real backend server-to-server via `lib/auth/backend-auth-client.ts`
(`API_INTERNAL_URL`, never `NEXT_PUBLIC_API_BASE_URL`) — no CORS involved,
since none of this leaves the Next.js server:

- `POST /api/auth/login` — proxies `{email,password}`, sets the cookie,
  returns `{ accessToken, email, expiresAt }` (the browser never sees
  `refreshToken`).
- `GET /api/auth/session` — the one call the client makes on mount. Reads
  the cookie; if the access token isn't expired, returns it; if expired but
  the refresh token isn't, transparently refreshes first. A valid 30-day
  session shouldn't force a re-login just because the 15-minute access
  token lapsed between page loads.
- `POST /api/auth/refresh` — the same refresh logic, used by the
  401-retry path below.
- `POST /api/auth/logout` — clears the cookie unconditionally (the only
  real logout this frontend can perform) and best-effort calls the real
  `POST /auth/logout`, which is still a documented no-op placeholder.

### Tenant header (`lib/auth/tenant.ts`)

Every `apps/api` request — including login — must resolve a tenant or gets
a hard `400`. The backend supports hostname-subdomain resolution, but that
only works when the API itself is reachable at a tenant-specific hostname,
which isn't the case here (`NEXT_PUBLIC_API_BASE_URL`/`API_INTERNAL_URL` are
single fixed URLs shared by every tenant), and there's no lookup endpoint to
map a frontend subdomain to a tenant UUID without a new API contract. So
`resolveTenantId()` reads one configured `NEXT_PUBLIC_TENANT_ID` — every
deployment of this frontend targets exactly one tenant until real
per-visitor resolution is decided (see Risks).

### Client-side token handling

No bearer token in a readable cookie, no localStorage. `store/auth-store.ts`
holds `{ status, email, accessToken }` in memory only.
`providers/auth-provider.tsx` (mounted inside `AppProviders`) calls
`GET /api/auth/session` once on mount, schedules a proactive refresh ~60s
before `expiresAt`, and redirects to `/login?redirect=<path>&reason=expired`
if `status` ever flips to `unauthenticated` while on a portal path
(middleware only redirects on navigation, not on a client-side status
change mid-session — see "Login page" below for what `reason=expired`
does). `components/portal/user-menu.tsx` renders a `Skeleton` avatar while
`status === 'loading'` rather than flashing an "Unknown user" placeholder
during this bootstrap window.

### Login page (`app/(auth)/login/`)

The one real auth screen this phase adds — email + password, RHF +
`lib/validation/auth.ts` (Zod), submitting straight to
`authService.login()`. No signup/password-reset pages exist or are
planned: the real backend has no such endpoints
(`apps/api/src/modules/auth/README.md`'s own "No registration, no password
reset" scope note). No "remember me" either — the backend issues the same
token pair unconditionally, so there's no persistent-vs-session-only
choice for a checkbox to actually control.

`?redirect=` is validated before use (`safeRedirectPath()` in
`login-form.tsx` — must start with `/` and not `//`, else falls back to
`/dashboard`) to prevent an open-redirect via a crafted login link.
`?reason=expired` shows an `Alert` banner ("Your session has expired") —
set only by `middleware.ts`'s `checkSession()` (now three-state: `'valid'
| 'expired' | 'missing'`, distinguishing "cookie present but its refresh
token lapsed" from "never had one") and by `AuthProvider`'s own
mid-session-unauthenticated redirect, never on a plain first-time visit.

Errors are triaged via `AuthRequestError` (`services/auth/auth.service.ts`,
carries the real HTTP status something a bare `Error` didn't before):
401 → "the email or password you entered is incorrect" (never
differentiates which field, matching the backend's own deliberately
undifferentiated 401); 400 → the real backend validation message
surfaced (defense-in-depth — client Zod should catch most of these
first); anything else (500, or a plain network `TypeError`) → one honest
generic retry message.

### Request pipeline wiring

`services/api/interceptors.ts` registers a request interceptor that
attaches `Authorization: Bearer <token>` (from `useAuthStore.getState()`)
and the tenant header — the first real use of this previously-empty seam,
and a no-op server-side (`typeof window === 'undefined'`) since the
in-memory token is a per-browser-tab concept, not something safe to read
from a shared Node module during SSR. `services/api/request.ts` handles a
401 by calling the BFF refresh once, updating the store, and retrying the
original request once. The refresh call itself is de-duplicated inside
`authService.refresh()` (`services/auth/auth.service.ts`), not in
`request.ts` — that's the one real shared network boundary both real
callers (this 401-retry path, and `AuthProvider`'s own proactive
pre-expiry timer) go through, so a single in-flight-promise guard there
covers both instead of each call site needing its own (found during the
Authentication Engineering Review: the two previously had independent,
undeduplicated `authService.refresh()` calls, which could have fired two
concurrent `POST /api/auth/refresh` requests if they landed close
together — harmless since the backend's refresh is stateless, but an
avoidable duplicate request).

### Middleware (`src/middleware.ts`)

Presence/expiry check only — decodes the cookie's refresh-token `exp`
without verifying its signature (no secret is, or should be, available
here). This is a UX-routing shortcut, not a security boundary: real
enforcement is exclusively `apps/api`'s own `JwtAuthGuard` on every direct
API call. Redirects portal paths to `/login` when absent/expired (with
`reason=expired` only in the expired case, never when no cookie ever
existed), auth paths to `/dashboard` when a valid session exists.

### Route protection error copy (`lib/errors/error-copy.ts`)

`app/(portal)/error.tsx` and `app/(auth)/error.tsx` both map a caught
error's `normalizeError()` result through `getErrorCopy()` for distinct
title/description text — 401 ("session expired"), 403 ("you don't have
access to this"), 404, 5xx, network, and a generic fallback — instead of
one undifferentiated message regardless of what threw. 403 has no real
trigger yet (no permission-based business logic exists), so this is
groundwork a future permission-gated module can render correctly against
without this file changing again, not a feature being added early.

### Logout

`UserMenu` → `authService.logout()` → `POST /api/auth/logout` → clear
`auth-store` → `router.push('/login')`.

### Authentication Engineering Review (2026-07-26)

A review-and-fix pass over the auth layer built the previous session —
modeled on the Backend v1.0 Review phases and the Marketing Website
review, zero new auth features. Real issues found and fixed:

- **Duplicate refresh calls** — see "Request pipeline wiring" above
  (`request.ts`'s 401-retry and `AuthProvider`'s proactive timer had
  independent, undeduplicated `authService.refresh()` calls; now share
  one in-flight promise at the real network boundary).
- **Open-redirect bypass in `?redirect=` handling** — `login-form.tsx`'s
  `safeRedirectPath()` previously only checked `path.startsWith('//')`
  to reject a protocol-relative external URL. The WHATWG URL spec
  normalizes a leading backslash the same as a forward slash for special
  schemes (a legacy IE-compat rule still in the spec), so
  `/\evil.com`/`/\/evil.com` bypass a plain string-prefix check exactly
  like `//evil.com` — a real, known open-redirect class. Fixed by
  resolving the path against a fixed base with the real `URL` parser and
  comparing origins, which inherits the browser-standard normalization
  instead of re-deriving it by hand.
- **Missing `Cache-Control: no-store`** on every auth BFF response that
  carries the real access token in its body (`login`/`session`/`refresh`,
  plus `logout` for consistency) — new `lib/auth/no-store-response.ts`.
  Calling `cookies()` already opts these routes out of Next's own
  build-time render cache, which is a different concern from the actual
  HTTP header a downstream proxy/CDN would honor; this closes that gap
  explicitly rather than relying on it being true by coincidence.
- **Redundant dedup code removed** — `request.ts` had its own
  in-flight-promise guard around `authService.refresh()`, now redundant
  with the guard moved into `authService.refresh()` itself (see above);
  simplified to remove the duplicate pattern.

Verified, not changed (already correct): no localStorage/sessionStorage
token usage anywhere (the one grep hit was a comment explicitly
documenting the absence, not a real usage); no sensitive data (passwords,
tokens) logged anywhere in the BFF routes or client code — the one
`console.error` in `(auth)/error.tsx` logs a `NormalizedError`, never raw
credentials; relaying a `BackendAuthError`'s body verbatim to the browser
is safe because the real backend's own exception filter is independently
verified (Backend v1.0 Security Hardening milestone) to never leak stack
traces or internals in any error response; `SameSite=lax` cookie
attribute unchanged (CSRF assumption intact); login/logout/redirect flows
manually traced end to end against the actual code (not run, see
Validation) and found consistent; PasswordInput/Input's non-`forwardRef`
pattern correctly forwards RHF's field ref under React 19's prop-based
ref semantics (checked directly against the installed React version
rather than assumed from older-React conventions).

## 6. API runtime (`services/api/*`)

- **Retry strategy**: `request.ts` retries GET requests on network failure
  or a 5xx response, twice, with a fixed 300ms/900ms backoff — never for
  mutations or 4xx (retrying a client error won't fix it; retrying a
  mutation risks a duplicate side effect).
- **401 handling**: see §5 — a single silent refresh-and-retry, not part of
  the generic retry loop.
- **Cancellation**: already fully wired (`signal` passed through to
  `fetch`) — pass a `queryFn`'s own `signal` straight through, nothing else
  to configure.
- **Interceptors**: the auth/tenant header attachment from §5.

## 7. Query architecture

`config/query.ts` — `QueryClient` defaults consumed by
`providers/query-provider.tsx`: queries retry network/5xx up to twice, skip
any 4xx `ApiError`; mutations never auto-retry (`retry: 0`). A
`MutationCache.onError` shows a `sonner` toast (via `normalizeError`) as a
safety net — queries stay silent by default, since the calling component
owns error display via `components/ui/error-state.tsx`.

`lib/query/query-keys.ts` — one generic `createQueryKeys(scope)` factory
(`all/lists/list(filters)/details/detail(id)`), no business keys yet.
`lib/query/README.md` documents invalidation, optimistic updates
(`onMutate`/`onError` rollback), prefetch (`prefetchQuery` +
`HydrationBoundary`), and infinite-query conventions with short
illustrative snippets.

## 8. Global state (`store/*`)

Per `store/README.md`'s carve-out ("`store/` itself holds only the shared
factory and cross-cutting stores"), three new ones:

- **`auth-store.ts`** — session status/email/in-memory access token (§5).
- **`ui-store.ts`** — `sidebarCollapsed` (persisted via zustand's `persist`
  middleware), `commandPaletteOpen`/`mobileNavOpen` (transient, not
  persisted). **Not** built via the shared `createStore()` factory — that
  factory's generic (`StateCreator<T>`, no mutator type parameters) doesn't
  compose with `persist` without losing type safety on `set`. Built
  directly with `create<T>()(devtools(persist(...)))`, using the same
  `devtools` config `createStore()` itself uses, so devtools inspection
  stays consistent. A real, narrow type-level gap in the shared factory,
  not something this phase's scope covers fixing generically.
- **`notification-store.ts`** — mocked notification-center list, distinct
  from `sonner`'s toast queue.

Theme stays on `next-themes` (already wired) — not duplicated into
Zustand. `set()` calls across all three stores use the plain 2-argument
form (`set(partial)`/`set(updater)`), not the 3-argument devtools
action-name form — `createStore()`'s declared `StateCreator<T>` type only
supports 2 args; devtools entries show as unlabeled rather than
per-action-named, a cosmetic-only trade-off.

## 9. Error handling

Route-group `error.tsx` (root + `(marketing)`/`(portal)`/`(auth)`) now use
`components/ui/error-state.tsx` instead of the Foundation phase's
deliberate plain-HTML placeholders — the design system exists now, so this
is completing that phase's own stated intent, not redesigning it. A
`(portal)` or `(auth)` error boundary renders inside its layout's shell
(Next.js error boundaries wrap a segment's content, not its own layout), so
no shell duplication is needed inside them.

**`global-error.tsx` is the one deliberate exception** — it stays plain
HTML/inline styles. It only fires when the root layout itself crashes, so
it must render its own `<html>`/`<body>`; the fewer modules a true
last-resort fallback depends on, the fewer ways it can itself fail to
render.

401s are handled entirely by the auth pipeline (§5), not a generic error
boundary. `lib/errors/normalize-error.ts` (unchanged) already classifies
`network` failures; `ErrorState`'s `onRetry` covers the retry action for
both cases.

## 10. Loading architecture

Route-group `loading.tsx` per group, using `components/ui/skeleton.tsx`/
`spinner.tsx`. The colocated `*.skeleton.tsx`-per-component convention
documented in `frontend.md` remains documented-not-built — its first real
consumers arrive with real feature pages, not this phase.

## 11. Accessibility

- Skip link + `id="main-content"` landmarks (§2).
- Every new layout/shell component carries the right landmark role:
  `<header>` (`Navbar`, `PortalHeader`), `<nav aria-label="…">`
  (`DesktopNav`, `MobileNav`, `Breadcrumb`), `<aside>` (`Sidebar`),
  `<main id="main-content">`, `<footer>`.
- Keyboard access comes largely for free from already-accessible
  primitives: `NavLink`/`next/link` are native anchors; `Drawer` (vaul) and
  `Dialog`/`DropdownMenu`/`Popover` (Radix) already provide focus trap,
  `Esc`-to-close, and return-focus-to-trigger — verified by inspection, not
  rebuilt.
- `CommandDialog` (shadcn's `command.tsx`) sets an `sr-only` title/
  description automatically, giving the palette an accessible name without
  visual clutter.
- Next.js App Router's built-in route-change announcer needs no additional
  code.

## 12. Performance

- `CommandPalette` is lazy-loaded (`next/dynamic`, `ssr: false`) from
  `portal-shell.tsx` — `cmdk`'s search weight isn't part of the initial
  portal bundle, and a command palette has no meaningful server-rendered
  state, so `ssr: false` costs nothing.
- The desktop/mobile nav split stays CSS-only (Tailwind breakpoints), not a
  JS media-query hook.
- All in-app navigation uses `next/link` (default prefetch) — no `<a>`
  tags for internal routes.
- Fonts unchanged (`next/font`, `display: swap`).
- Client/server boundaries stay narrow: `'use client'` only on genuinely
  interactive pieces (`PortalShell`, `PortalHeader`, `UserMenu`,
  `NotificationCenter`, `CommandPalette`, `NavLink`, `MobileNav`); `Footer`
  and the static parts of `Navbar` stay Server Components.

## 13. Architectural decisions log

- **`(app)` route group not created.** The brief's Part 1 lists `(app)`
  alongside the other three route groups; read literally that would nest
  `(portal)` one level deeper for no behavioral reason (route groups don't
  add URL segments), and nothing anywhere describes what `(app)` alone
  would contain. Treated as a heading for "the App Router as a whole," not
  a folder to create.
- **Access token in memory, refresh token in an httpOnly cookie, one
  combined `SESSION_COOKIE_NAME` cookie.** Follows the exact seam the
  Foundation phase reserved (`SESSION_COOKIE_NAME`, `API_INTERNAL_URL`)
  rather than inventing a different cookie strategy.
- **A search-styled button instead of a real search input** in
  `PortalHeader` — see §3.
- **`ui-store.ts` bypasses `createStore()`** — see §8.
- **Root/marketing/portal/auth `error.tsx` upgraded to `ErrorState`;
  `global-error.tsx` deliberately not** — see §9.

## Risks / recommendations

- **Tenant resolution in production is unresolved at the product level.**
  Subdomain-per-tenant UX was never decided (`docs/implementation/blockers.md`).
  `NEXT_PUBLIC_TENANT_ID` keeps a single-tenant deployment working; real
  multi-tenant frontend routing needs a product decision (and likely a new,
  currently-nonexistent tenant-lookup endpoint) before it can support more
  than one tenant per deployment.
- **The session cookie's `maxAge` duplicates the backend's
  `JWT_REFRESH_TOKEN_TTL` default** as a frontend constant
  (`lib/auth/session-cookie.ts`) — it will silently drift if that backend
  env value ever changes, since the frontend has no way to read it.
- **No `/me` endpoint** (a known Backend v1.0 Review Phase 4 finding) means
  the client can only ever know `email` — no name/role/permissions
  client-side. Fine today (no permissioned nav yet), but every future
  RBAC-aware UI decision will hit this gap.
- **Middleware's expiry check is presence/UX-only, not a security
  boundary** — real enforcement is exclusively `apps/api`'s own
  `JwtAuthGuard` on every direct API call.
- **`store/create-store.ts`'s generic doesn't compose with additional
  middleware** (e.g. `persist`) without a consumer bypassing it, as
  `ui-store.ts` does. A future session could generalize its type signature
  (zustand's standard `Mps`/`Mcs` mutator-array generic pattern) if a
  second store ever needs the same composition — not done here to keep
  this phase's diff to the shared factory at zero.
- **No double-submit guard on the login form beyond the disabled submit
  button** — a very fast double-click could theoretically fire two
  concurrent login requests before React re-renders the disabled state.
  Same pattern already used identically in `contact-form.tsx`/`quote-
  wizard.tsx`; the backend's own login-specific rate limit (5 attempts/
  60s, Milestone 13) bounds the real-world impact, and both requests are
  independently valid if they succeed. Flagged as low-severity, consistent
  pre-existing convention, not fixed here to avoid diverging from the
  other two forms without fixing all three.
- **`error-copy.ts`'s 401 case is largely theoretical today** — the real,
  current 401-expiry recovery path is `AuthProvider`'s redirect effect,
  which runs independently of whether any component ever throws a 401
  during render (the only way an error boundary would see it). No
  business page exists yet that fetches data during render in a way that
  would exercise this path for real — worth re-confirming once one does.
