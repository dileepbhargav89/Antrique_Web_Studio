# Frontend service layer — API clients, auth session, analytics

`api/` and `auth/` are both real now — see `api/client.ts` for usage
(`apiClient.get/post/put/patch/delete`) and `auth/README.md` for the BFF
session client. `analytics/` remains an empty scaffold.

## `api/` — architecture

- `config.ts` — re-exports `@/config/api` (base URL/timeout).
- `http-error.ts` — `ApiError`, matching the backend's real
  `{ statusCode, message, error }` response shape.
- `interceptors.ts` — request/response interceptor pipeline. Registers one
  default request interceptor (Bearer + `X-Tenant-ID` header attachment for
  direct browser → `apps/api` calls) — see
  `docs/architecture/application-runtime.md`'s auth flow.
- `request.ts` — generic typed `request<T>(path, options)` fetch wrapper.
  Also owns the 401-refresh-and-retry-once logic and a GET-only
  network/5xx backoff retry (300ms/900ms, 2 attempts).
- `client.ts` — `apiClient`, the public surface feature code imports.

Response bodies are typed via an explicit `T` type argument, not inferred
from `@/types/api/schema.ts` — every response DTO in the backend currently
serializes with empty JSON-schema detail (a documented backend limitation,
see Backend v1.0 Review Phase 4 in `docs/implementation/progress.md`).
Request bodies can reuse the generated `paths[...]["requestBody"]` types
directly, since request DTOs are fully typed.

Regenerating `@/types/api/schema.ts`: run `pnpm generate:api-types` from
the repo root (requires the API's own `DATABASE_URL` to be reachable — it
boots the real `AppModule` and introspects it live). See
`docs/architecture/frontend.md` for detail.
