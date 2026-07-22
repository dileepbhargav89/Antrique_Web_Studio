# Guards

`JwtAuthGuard` (Milestone 2 — Authorization Foundation), a hand-written
`CanActivate`, not `@nestjs/passport` (explicitly out of scope): reads
the `Authorization: Bearer <token>` header
(`extractBearerToken()`, `jwt-auth.constant.ts`'s `AUTHORIZATION_HEADER`/
`BEARER_PREFIX`), verifies it exclusively through
`TokenService.verifyAccessToken()` (`apps/api/src/jwt/`, never
`@nestjs/jwt`'s `JwtService` directly, and never
`verifyRefreshToken()` — a refresh token presented here fails the same
signature check a forged token would, since it was signed with the
*refresh* secret, no separate "is this a refresh token" branch needed),
and attaches the result to `request.user` as a frozen (`Object.freeze()`)
`RequestUser` (`apps/api/src/types/request-user.type.ts`) — genuinely
immutable at runtime, not only `readonly`-typed. Any failure — missing
header, wrong scheme, malformed token, invalid signature, expired, or a
refresh token — is one undifferentiated `401`, the same discipline
`AuthService.login()`/`.refresh()` already established.

Applied per-route via `@UseGuards(JwtAuthGuard)` (see
`modules/example-domain/example-domain.controller.ts`'s `ping()`, the
one route this milestone protects), not registered globally via
`APP_GUARD` — `POST /auth/login`/`/refresh`/`/logout` stay unauthenticated
by not having the decorator, not via an exemption mechanism (no
`@Public()` decorator exists, since nothing needs one yet). No explicit
provider registration is needed in any module: Nest resolves
`JwtAuthGuard` through its own DI container by class reference, and its
only dependency, `TokenService`, is `@Global()`.

**Testing note:** referencing a guard via `@UseGuards()` metadata pulls
it into a `Test.createTestingModule()`'s DI graph even if the test never
exercises the guard directly — Nest eagerly instantiates every
injectable a compiled `TestingModule` can reach. Any future protected
controller's own spec needs a `TokenService` provider (real or mocked)
for `.compile()` to succeed, even if that spec only calls the controller
method directly and never goes through the guard itself (see
`example-domain.controller.spec.ts`, which since Milestone 3 also needs
an `AuthorizationService` mock — its `ping()`/`permissionPing()` routes
now carry `RolesGuard`/`PermissionsGuard` too).

## RolesGuard / PermissionsGuard (Milestone 3 — Role & Permission Foundation)

Two more hand-written `CanActivate` guards, same shape as `JwtAuthGuard`:
`RolesGuard` (`roles.guard.ts`) reads `@Roles(...)` metadata
(`common/decorators/roles.decorator.ts`) via `Reflector`, `PermissionsGuard`
(`permissions.guard.ts`) reads `@Permissions(...)` metadata
(`common/decorators/permissions.decorator.ts`) the same way. Neither
verifies a JWT — `TokenService` remains the only JWT component, untouched
by either guard — and neither ever returns/throws `401`: that stays
`JwtAuthGuard`'s exclusive job. Both read `request.user` (the
`RequestUser` `JwtAuthGuard` already attached) and delegate the actual
question ("does this user hold role/permission X?") to
`AuthorizationService` (`apps/api/src/authorization/`, `@Global()`),
never querying the database themselves.

**Guard ordering is load-bearing, not incidental.** Every route that uses
either new guard stacks it after `JwtAuthGuard`:
`@UseGuards(JwtAuthGuard, RolesGuard)` — `@UseGuards()`'s array order is
execution order, so `JwtAuthGuard` verifies the token and populates
`request.user` before `RolesGuard`/`PermissionsGuard` ever run. Both new
guards *trust* this ordering rather than re-check it (no defensive `401`
fallback if `request.user` were somehow missing) — see each guard's own
header comment. Route metadata with no `@Roles()`/`@Permissions()`
applied means nothing to enforce; both guards return `true` in that case,
matching `JwtAuthGuard`'s own "opt-in per route" pattern.

**Milestone 4 (Organization & Multi-Tenant Foundation):** both guards
also read `request.tenantContext` (`TenantMiddleware`,
`apps/api/src/tenant/` — populated for EVERY request application-wide,
not just guarded ones, so it's always present by the time any guard
runs) and pass `tenantId` through to `AuthorizationService`, which
resolves roles/permissions **within that specific tenant** now, not a
fixed default. Same "trust, don't re-derive" relationship as with
`JwtAuthGuard`'s `request.user` — neither guard resolves tenant itself.

**Semantics differ between the two:** `@Roles('admin', 'super_admin')`
grants access to a caller holding *any one* of the listed roles (OR — a
user typically holds one primary role). `@Permissions('projects:read',
'projects:write')` requires *all* listed permissions (AND — permissions
are additive requirements for a single action). Both throw
`ForbiddenException` (`403`) on failure.

**Request-scoped cache, not a service field.** Both guards create
`request.authorizationCache ??= {}` on first use and pass it into
`AuthorizationService`'s methods — see `apps/api/src/authorization/README.md`
for why the cache lives on the request object, not on the (singleton)
service itself.

Applied per-route the same way as `JwtAuthGuard` — see
`modules/example-domain/example-domain.controller.ts`'s `ping()`
(`JwtAuthGuard` + `RolesGuard`, requiring the `admin` or `super_admin`
role) and `permissionPing()` (`JwtAuthGuard` + `PermissionsGuard`,
requiring the `projects:write` permission), the two example endpoints
this milestone protects. No global `APP_GUARD` registration for either,
matching `JwtAuthGuard`'s own established reasoning
(`docs/implementation/decisions.md`).

No permission-management API, no wildcard/hierarchical permission
matching, no caching beyond one request — see
`apps/api/src/authorization/README.md` for the full RBAC foundation these
two guards sit on top of.
