# Centralized configuration

- `env.ts` — Zod-validated `clientEnv` (`NEXT_PUBLIC_*` only) — safe to import from client
  components.
- `env.server.ts` — Zod-validated `serverEnv` (extends `clientEnv` with server-only vars:
  `API_INTERNAL_URL`, `SESSION_COOKIE_NAME`, `SENTRY_DSN`) — **never** import from client
  code. Deliberately a separate file, not just a separate export from `env.ts`: ES modules
  execute the whole file on import regardless of which export was requested, so a `serverEnv`
  living in the same file as `clientEnv` still gets eagerly validated (and fails, since
  server-only vars are correctly stripped from the browser bundle) the moment any client code
  imports `clientEnv` — which `api.ts` does, and every portal page does transitively via
  `apiClient`. Confirmed as a real bug this file split fixes.
- `app.ts` — site name/description/locale.
- `api.ts` — API base URL/version/timeout, consumed by `services/api/config.ts`.
- `routes.ts` — typed path constants for existing route-group scaffolds.
- `feature-flags.ts` — static typed flag map, read via `isFeatureEnabled()`.
- `metadata.ts` — default Next.js `Metadata`, used by the root `layout.tsx`.
