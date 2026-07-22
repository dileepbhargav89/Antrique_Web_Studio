# AuthorizationModule (Milestone 3 — Role & Permission Foundation, Milestone 4 — tenant-parameterized, Milestone 12 — cross-request cache)

RBAC infrastructure, a new top-level infra module mirroring `jwt/`
(`TokenModule`) and `password/` (`PasswordModule`)'s exact precedent:
`@Global()`, exports one service, genuinely functional, database-driven.
Not part of `modules/auth/` — `AuthModule` itself is completely unchanged
(`login()`/`refresh()`/`logout()` never need role or permission
resolution); this module's only consumers are the cross-cutting
`RolesGuard`/`PermissionsGuard` (`apps/api/src/common/guards/`), the same
category of consumer `TokenService`/`PasswordService` already serve.

**Milestone 4 (Organization & Multi-Tenant Foundation) update:** every
method here now takes `tenantId` as a plain parameter, resolving roles/
permissions **within the resolved tenant** instead of a fixed default —
"Update AuthorizationService to resolve roles and permissions within the
resolved tenant" was that milestone's own explicit requirement. This
module no longer imports `ConfigModule.forFeature(defaultTenantConfig)`
at all — see below.

## What's real here

- `authorization.module.ts` — `AuthorizationModule`, `@Global()`, imported
  into `AppModule`. No longer imports any config namespace (Milestone 4 —
  `RoleRepository`/`PermissionRepository` take `tenantId` as a method
  parameter now, not an injected stopgap value; see
  `apps/api/src/tenant/README.md` for where that config now lives and
  who its one remaining consumer is).
- `authorization.service.ts` — `AuthorizationService`, constructor-injects
  `RoleRepository`/`PermissionRepository`. Never verifies or signs a JWT
  itself (`TokenService` remains the only JWT component — this service
  doesn't import it) and is never called from `AuthController`'s own
  routes. Two methods:
  - `resolveRoleKeys(email, tenantId, cache)` — the role `key`s the user
    (identified by email — see "Why email, not userId" below) holds
    within the given tenant.
  - `resolvePermissionKeys(email, tenantId, cache)` — the deduplicated
    union of permission `key`s granted by every role that user holds
    within the given tenant.
  `tenantId` comes from the request's resolved `TenantContext`
  (`RolesGuard`/`PermissionsGuard` read `request.tenantContext` directly
  — see `common/guards/README.md`) — a user's roles are tenant-scoped
  rows (`UserRole.tenantId`), so resolving against the wrong tenant would
  either find nothing or, worse, mix grants across tenants if the query
  weren't scoped at all.

  **Stateless itself** — a singleton (Nest's default scope) with no
  mutable instance fields. "Cache permission resolution within a request
  only, no Redis or external cache" (this milestone's own requirement) is
  achieved without request-scoped DI: every method takes the *caller's*
  `AuthorizationCache` (`apps/api/src/types/authorization-cache.type.ts`)
  — a plain object `RolesGuard`/`PermissionsGuard` create fresh per
  request and store on `request.authorizationCache`, the same place
  `request.user` already lives — and mutates it in place. A singleton
  service holding this cache as its *own* field would leak one caller's
  resolved roles/permissions into a concurrent, unrelated request; storing
  it on the request object instead makes that structurally impossible.
  Both methods share one role lookup via a private `loadRoles()` helper,
  so a route guarded by both `RolesGuard` and `PermissionsGuard` (not used
  anywhere yet, but architecturally supported) queries the database for
  the user's roles once per request, not twice.

  **Milestone 12 (Performance Engineering) update:** `loadRoles()` now
  checks the per-request `AuthorizationCache` first (unchanged, above),
  and only on a miss there falls through to a SECOND, cross-request layer
  — `CacheService.getOrLoad('role-keys:{tenantId}:{email}', 60_000, () =>
  roleRepository.findRolesForUser(...))` (`apps/api/src/cache/`, see that
  module's own README) — before finally reaching the database. This is
  additive, not a redesign: the per-request layer's own semantics
  (populated lazily, shared between `RolesGuard`/`PermissionsGuard` within
  one request, discarded at the end of it) are completely unchanged; a
  request whose per-request cache is empty may now be satisfied by the
  cross-request layer instead of a real query, that's the only difference.
  Why this doesn't violate "cache within a request only, no Redis or
  external cache" (Milestone 3's own original requirement, still true of
  the ORIGINAL `AuthorizationCache` layer): `CacheService` is in-memory,
  process-local — not Redis, not external — and role/permission grants
  are read-mostly reference data, not the mutable transactional state that
  instruction was actually guarding against (see
  `docs/architecture/performance.md` §1.1/§5 for the full reasoning).

- `repositories/role.repository.ts` — `RoleRepository extends
  BaseRepository<PrismaService['role']>`. One real custom method:
  `findRolesForUser(email, tenantId)` — a single query joining
  `Role → UserRole → User` via a nested Prisma relation filter
  (`userRoles: { some: { user: { email: {...} } } } }`), tenant-scoped on
  both `Role` and the nested `User` via the caller-supplied `tenantId`
  (Milestone 4 — no longer a constructor-injected stopgap), excluding
  soft-deleted rows on both sides.
- `repositories/permission.repository.ts` — `PermissionRepository extends
  BaseRepository<PrismaService['permission']>`. One real custom method:
  `findPermissionsForRoles(roleIds, tenantId)` — joins
  `Permission → RolePermission`, tenant-scoped through the join
  (`Permission` itself has no `tenantId` column — it's a global catalog,
  see `database-schema.md` §2 — but the `RolePermission` grant that ties
  a permission to a role *is* tenant-scoped, so filtering through it
  still honestly satisfies CLAUDE.md's "tenant scope on EVERY query" rule
  at the point a tenant boundary genuinely applies).

  Both repositories are data-access only (this milestone's own
  requirement) — no role/permission *resolution* logic in either; that's
  `AuthorizationService`'s job.

## Why email, not userId

`RequestUser` (`apps/api/src/types/request-user.type.ts`) is deliberately
`{ email }` only — Milestone 2's own scope boundary ("Do not introduce
roles, permissions, tenant, or profile fields yet"), unchanged by this
milestone. Rather than extend the JWT payload/`RequestUser` with a
`userId` (which would have touched `AuthTokenPayload`, `login()`,
`refresh()`, and every already-approved, already-tested piece of that
chain), `RoleRepository.findRolesForUser()` resolves directly from `email`
via a nested relation filter through `User` in the same query — no
separate "look up the user first" step, no dependency on
`modules/auth/repositories/auth.repository.ts` (which exports nothing
today). `POST /auth/login`/`/refresh`/`/logout` are genuinely,
byte-for-byte unchanged by Milestone 3, and `refresh()`/`logout()` remain
unchanged by Milestone 4 too — only `login()` gained a `TenantContext`
parameter (see `modules/auth/README.md`), and that's a separate concern
from this section (which is about *user* identity, not tenant). See
`docs/implementation/decisions.md` for the full reasoning.

## What this module explicitly does NOT do

No Redis/external cache, no permission-management API (create/edit
roles or grants — so no live trigger exists yet to invalidate the
Milestone 12 cross-request cache early; it relies on its own 60s TTL
alone until one does, see `cache/README.md`), no UI, no policy engine
beyond "does the user hold role X" / "does the user hold permission Y,"
no wildcard/hierarchical permission matching (`projects:*` doesn't imply
`projects:read` — every grant is an exact key match). The per-request
`AuthorizationCache` itself is still discarded with the request it was
created for, exactly as originally designed — only the layer BENEATH it
now optionally survives across requests.
See `apps/api/src/common/guards/README.md` for `RolesGuard`/
`PermissionsGuard` themselves, and
`apps/api/src/modules/auth/constants/role.constant.ts`/
`permission.constant.ts` for the role/permission key constants real code
references.
