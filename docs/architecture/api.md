# REST API Design

Resource-oriented, tenant-implicit (scope from token, never in URL). Spec lives in
`packages/api-contract/openapi/openapi.yaml` (validated OpenAPI 3.1).

## Versioning
URL path `/api/v1`. Major bump on breaking changes; additive within v1.
Deprecation/Sunset headers.

## Auth & authz
Bearer JWT (HTTP-only cookie for portal). RBAC action gate + RLS row gate, both
enforced. 401 = not authenticated, 403 = not permitted, 404 for foreign-tenant
rows (no existence leak). Step-up for sensitive actions.

## CRUD
Plural nouns, verbs = HTTP methods. PATCH default update (partial). DELETE =
soft-delete (204). Nested ≤2 levels; deeper → filtering.

## Collections
Cursor pagination (stable under inserts; capped). Whitelisted+indexed filter/sort
fields (`?status=&sort=-created_at`). Full-text search (`?q=`) separate from
filtering; all compose.

## Validation
Schema-driven (shared package), at the boundary. 422 with per-field errors;
400 for malformed.

## Rate limiting
Tiered (unauth by IP, auth per user/tenant, sensitive tighter). RateLimit-*
headers; 429 + Retry-After.

## Caching
Public GETs: Cache-Control public + ETag. Authenticated: private/no-store, never
shared-cached. Conditional requests supported.

## Response & errors
`{ data }` / `{ data, pagination }`. Errors = RFC 9457 problem+json with trace_id.
Human-readable, no stack traces, no sensitive data.

## Safety
Never accepts card/credential data; payments return hosted-gateway URL; never
auto-submits on the user's behalf.
