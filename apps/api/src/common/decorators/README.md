# Decorators

`CurrentUser` (Milestone 2 — Authorization Foundation), a custom
`createParamDecorator()` that reads the `RequestUser`
(`apps/api/src/types/request-user.type.ts`) `JwtAuthGuard`
(`common/guards/jwt-auth.guard.ts`) already attached to `request.user`.
Has no verification logic of its own — it can only return a real,
authenticated user on a route also guarded by `JwtAuthGuard` (`undefined`
otherwise, since nothing else in this codebase sets `request.user`); see
`modules/example-domain/example-domain.controller.ts`'s `ping()` for the
one route both are wired into together so far.

The raw extraction logic (`extractCurrentUser()`) is exported separately
from the `createParamDecorator()`-wrapped `CurrentUser` itself — Nest's
param-decorator factories are invoked by its own reflection/metadata
machinery, not callable directly the way a plain function is, so
`extractCurrentUser()` is what `current-user.decorator.spec.ts` actually
unit-tests. `CurrentUser` itself is proven end-to-end through a real
protected controller instead (see `example-domain.controller.spec.ts`
and this milestone's live `GET /example/ping` boot test).

## Roles / Permissions (Milestone 3 — Role & Permission Foundation)

`Roles(...roles)` (`roles.decorator.ts`) and `Permissions(...permissions)`
(`permissions.decorator.ts`) — a different kind of decorator than
`CurrentUser`: both are thin wrappers over Nest's own `SetMetadata()`,
attaching a plain string array under `ROLES_KEY`/`PERMISSIONS_KEY`
(`authorization-metadata.constant.ts`) to the route handler's/
controller's reflection metadata. **Metadata only — neither performs any
authorization logic itself** (this milestone's own requirement); reading
that metadata and deciding anything is `RolesGuard`'s/`PermissionsGuard`'s
job (`common/guards/roles.guard.ts`/`permissions.guard.ts`), via
`Reflector`, not these decorators. `@Roles('admin', 'super_admin')` means
"any one of these is enough" (OR); `@Permissions('projects:read',
'projects:write')` means "all of these are required" (AND) — see
`common/guards/README.md` for the reasoning behind that asymmetry.

Each is directly unit-tested via a real `Reflector` reading back the
metadata a decorated class/method actually carries
(`roles.decorator.spec.ts`/`permissions.decorator.spec.ts`) — no
`ExecutionContext`/HTTP layer involved, since `SetMetadata()` has nothing
to do with a running request. See `modules/example-domain/
example-domain.controller.ts` for both applied to real routes.

## Tenant / Organization (Milestone 4 — Organization & Multi-Tenant Foundation)

`Tenant()` (`tenant.decorator.ts`) and `Organization()`
(`organization.decorator.ts`) — the same `createParamDecorator()` +
standalone-exported-extraction-function shape as `CurrentUser`
(`extractTenant()`/`extractOrganization()` are what their `.spec.ts`
files actually unit-test). Read `request.tenantContext`/
`request.organizationContext`, both attached by `TenantMiddleware`
(`apps/api/src/tenant/middleware/tenant.middleware.ts`) from one
resolution per request. Unlike `CurrentUser` (only resolves on a route
also guarded by `JwtAuthGuard`), these resolve on **any** route,
authenticated or not — `TenantMiddleware` runs application-wide via its
own `NestModule.configure()`, independent of per-route guards; even
`POST /auth/login`, which carries no guard at all, gets a real
`TenantContext`.

`Tenant()` returns the minimal `{ tenantId }` (for query-scoping —
`modules/auth/auth.controller.ts`'s `login()` is the one call site so
far); `Organization()` returns the richer `{ id, name, slug }` (for
display — `modules/example-domain/example-domain.controller.ts`'s
`GET /example/organization` is the one call site so far). See
`apps/api/src/tenant/README.md` for the full resolution/attachment
mechanism both decorators sit on top of.
