# API Contract — pre-implementation design draft, NOT current

**This package does not describe the real, implemented `apps/api` backend.**
`openapi/openapi.yaml` was written during Phase 0 (repository foundation,
before any backend code existed) as an aspirational design for the eventual
API — it was never regenerated or reconciled against the real implementation,
and several of its own stated conventions were deliberately not what got
built (see below). No typed client or contract tests were ever actually
generated from it — `generated/` doesn't exist in this package despite the
line below originally claiming it does.

**For the real, current, authoritative API contract** (API-frozen as of
Backend v1.0 Review Phase 3), use:
- The live Swagger UI: `GET /api/docs` (see `apps/api/README.md`).
- The CI-generated artifact: `apps/api/openapi.json`, produced fresh on
  every run by `pnpm --filter @antrique/api generate:openapi` — introspects
  the real running application, so it cannot drift from the real backend
  the way this hand-written file did.

## What this draft got right vs. what the real API actually does

| This draft says | The real, implemented API actually does |
|---|---|
| Cursor pagination | Offset-based (`page`/`limit`/`total`) — see `PaginatedResponseDto` |
| RFC 9457 problem-details errors | NestJS's default `{ statusCode, message, error }` shape |
| Optimistic locking via `version` → 409 | No `version` field; 409 comes from real unique/check-constraint conflicts only |
| `/projects`, `/users`, `/roles`, `/permissions`, `/auth/step-up` endpoints | None of these exist — `projects` was never built; roles/permissions are seeded, not CRUD-exposed; there is no `/users` or step-up-auth endpoint |
| 18 documented paths | 26 real business feature areas / ~40 real route paths — see `apps/api/README.md`'s structure section |

Tenant-implicit scoping, hosted-gateway-only payments, and soft-delete on
DELETE are the three conventions this draft got right and the real API
still follows.
