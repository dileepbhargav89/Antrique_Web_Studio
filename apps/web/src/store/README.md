# Zustand store conventions

Describes the purpose of this directory. Still no *feature* stores — but
two genuinely cross-cutting ones now live directly in `store/`, per the
carve-out below: `auth-store.ts` (session status/email/in-memory access
token — see `docs/architecture/application-runtime.md`'s auth flow),
`ui-store.ts` (sidebar-collapsed, command-palette-open, mobile-nav-open —
`sidebarCollapsed` persisted via zustand's `persist` middleware, the other
two deliberately not).

`notification-store.ts` existed briefly as a mocked, never-populated shell
for the portal notification center — removed once
`components/portal/notification-center.tsx` was wired to real data
(`features/admin/hooks/use-notifications.ts`). The backend has no
mark-read/dismiss endpoints, so there was no honest client-only state left
for a store to hold; that state now lives entirely in TanStack Query.

## When to use a store vs. TanStack Query

- **Server state** (anything that originates from the API — orders,
  invoices, catalog data) belongs in TanStack Query, not a store. Query
  already gives caching, refetch, and invalidation; duplicating that in
  Zustand is the "duplicate calculations/state already available
  elsewhere" mistake the backend's own `domain-module-guide.md` warns
  against.
- **Client-only/UI state** (sidebar open/closed, a multi-step wizard's
  current step, theme override, draft form state not yet submitted)
  belongs in a Zustand store.

## Conventions

- One store per concern, named `use<Concern>Store` (e.g. `useUiStore`),
  file `kebab-case.store.ts` (existing cross-cutting stores are the one
  exception, named `<concern>-store.ts` directly in `store/` since they
  predate any `features/` colocation), colocated in the owning
  `features/<name>/` directory once real features exist — not all dumped in
  `store/`. `store/` itself holds only the shared factory and cross-cutting
  stores: `auth-store.ts`/`ui-store.ts` are that carve-out — session and
  shell chrome aren't owned by any single business feature.
- Build every store through `createStore()` (`create-store.ts`), not
  Zustand's `create` directly, so DevTools wiring stays consistent.
- Keep actions and state in the same store object; avoid separate
  "actions" stores.
- Select narrowly (`useUiStore((s) => s.isSidebarOpen)`), never the whole
  store, to avoid unnecessary re-renders.
