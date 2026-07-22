# Backend-internal shared types

`request-user.type.ts` — `RequestUser` (Milestone 2 — Authorization
Foundation): the authenticated identity `common/guards/jwt-auth.guard.ts`
attaches to `request.user` and `common/decorators/current-user.decorator.ts`
reads back out, plus the Express `Request` module augmentation that
makes `request.user` type-check everywhere. Deliberately unchanged by
Milestone 3 — RBAC resolution keys off `request.user.email`, not a new
`userId` field; see `apps/api/src/authorization/README.md`.

`authorization-cache.type.ts` — `AuthorizationCache` (Milestone 3 — Role &
Permission Foundation): the per-request cache `RolesGuard`/
`PermissionsGuard` (`common/guards/`) create and pass into
`AuthorizationService`'s methods, plus the matching Express `Request`
augmentation (`request.authorizationCache`) — the same pattern
`request-user.type.ts` established, one field over. Lives on the request
object, not as service instance state, specifically so a singleton
`AuthorizationService` never leaks one caller's resolved roles/permissions
into a different, concurrent request — see
`apps/api/src/authorization/authorization.service.ts`'s own comment.

`tenant-context.type.ts` — `TenantContext` (Milestone 4 — Organization &
Multi-Tenant Foundation): the minimal `{ tenantId }` `TenantMiddleware`
(`apps/api/src/tenant/`) attaches to `request.tenantContext` for EVERY
request (not just authenticated ones), read back out via `@Tenant()`
(`common/decorators/tenant.decorator.ts`). Deliberately kept separate
from `organization-context.type.ts`'s richer shape — the same
"minimal-for-scoping vs. richer-for-display" split
`request-user.type.ts`/`AuthTokenPayload` established for identity, one
concern over.

`organization-context.type.ts` — `OrganizationContext` (Milestone 4): the
richer `{ id, name, slug }` `TenantMiddleware` attaches alongside
`TenantContext` (one resolution, two derived views), read back out via
`@Organization()` (`common/decorators/organization.decorator.ts`). Used
for display (e.g. `GET /example/organization`), not query-scoping.

TypeScript types/interfaces shared across `apps/api`'s own modules
(request-context shapes, internal DTOs not part of the public API
contract). Types shared with `apps/web` or defining the public API surface
belong in `packages/shared` / `packages/api-contract` instead.
