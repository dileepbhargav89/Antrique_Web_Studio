# Authenticated client portal surface

`layout.tsx` redirects to `/login` without a valid session (defense-in-depth
alongside root `middleware.ts`) and composes `components/portal/portal-shell.tsx`
(sidebar/header/nav/user-menu/command-palette/notifications).
`error.tsx`/`loading.tsx` are real.

All 7 real backend business modules have real pages here, each consuming
the matching `features/<module>/` hooks (never static `content/*.ts`, never
a direct `apiClient` import — confirmed zero `content/*` imports anywhere
under this directory): `admin`, `bespoke`, `billing`, `catalog`, `crm`,
`inventory`, `orders`, plus `dashboard` (a simple nav hub, no data fetching
of its own). See `docs/architecture/application-runtime.md` for the shell/
navigation architecture and `features/README.md` for the API/hooks
convention every page here follows.
