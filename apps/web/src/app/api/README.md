# app/api — Next.js Route Handlers (BFF layer)

Not to be confused with the real backend API (`apps/api`, base URL
`NEXT_PUBLIC_API_BASE_URL`). This directory is for Next.js's own Route
Handlers — a backend-for-frontend layer for concerns that must run on the
Next.js server itself rather than call `apps/api` directly from the
browser.

## `auth/` (real, this phase)

`login/route.ts`, `refresh/route.ts`, `session/route.ts`, `logout/route.ts`
— the only reason this layer exists yet. The real backend
(`apps/api`) is strictly Bearer-token-authenticated (`credentials: false` in
its CORS config, no cookie reading anywhere), so an httpOnly session cookie
is a concept these Route Handlers own entirely, not something `apps/api`
knows about. Each one calls the real backend server-to-server via
`API_INTERNAL_URL` (`lib/auth/backend-auth-client.ts`) — never
`NEXT_PUBLIC_API_BASE_URL` — so none of this touches CORS. See
`docs/architecture/application-runtime.md` for the full auth flow (cookie
shape, tenant header resolution, refresh/logout semantics).

No other route handlers exist yet — future ones (webhooks, a
server-secret-requiring proxy) follow the same "runs on the Next.js server,
not the browser" rule.
