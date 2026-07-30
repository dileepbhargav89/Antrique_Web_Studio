# services/auth

`auth.service.ts` — client-safe wrappers around this app's own BFF routes
(`app/api/auth/*`), not the real backend. See
`docs/architecture/application-runtime.md` for the full flow and
`providers/auth-provider.tsx` (the one consumer that bootstraps
`store/auth-store.ts` from it on mount).
