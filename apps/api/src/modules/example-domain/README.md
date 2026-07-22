# ExampleDomainModule (Phase 1.2D.1–1.2D.3 — reference template; `ping()` protected since Milestone 2, RBAC-guarded since Milestone 3, tenant example since Milestone 4)

**This is not a real business domain.** It exists purely so every future
domain module (Auth, Users, Organizations, Products, Orders, ...) has a
working, live-tested skeleton to copy — the folder names, file naming, DI
wiring, and export rules, not any of its actual (near-empty) content.
Full standards: `docs/architecture/domain-module-guide.md`.

**Deliberate exception to "this module never changes":** Milestone 2's
own brief asked to "protect one example endpoint to verify the complete
authentication flow works end-to-end," and `GET /example/ping` was the
natural, lowest-risk choice — not scope creep, an explicit ask. Every
other phase through Phase 1.2D.10 confirmed this endpoint byte-for-byte
unchanged; this is the first, deliberate deviation from that streak.

## What's real here

- `example-domain.module.ts` — `ExampleDomainModule`, imported into
  `AppModule`. Not `@Global()` — domain modules are scoped by default.
- `example-domain.controller.ts` — `ExampleDomainController`, three routes:
  - `GET /example/ping` (`/api/v1/example/ping` once the global prefix and
    URI versioning apply — see `main.ts`). Since Milestone 2, guarded by
    `@UseGuards(JwtAuthGuard)` — requires a valid access token, `401`
    otherwise; since Milestone 3, `RolesGuard` is stacked on top
    (`@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('admin',
    'super_admin')`) — a caller with a valid token but neither role gets
    `403`. Both read `@CurrentUser()` (`apps/api/src/common/decorators/`)
    to pass the authenticated email through to the service.
  - `GET /example/permission-ping` (Milestone 3) — the matching
    example for `PermissionsGuard`:
    `@UseGuards(JwtAuthGuard, PermissionsGuard)`,
    `@Permissions('projects:write')`. Same response shape, same
    `@CurrentUser()` wiring — the guard stacked on each route is the
    entire difference being demonstrated between the two endpoints, not
    the response.
  - `GET /example/organization` (new, Milestone 4) — the reference for
    `@Tenant()`/`@Organization()` (`common/decorators/`): guarded by
    `@UseGuards(JwtAuthGuard)` **only** — no `RolesGuard`/
    `PermissionsGuard`, this milestone's own explicit ask, demonstrating
    that tenant resolution doesn't need an RBAC check layered on top.
    Returns `{ tenantId, organization: { id, name, slug } }` — both
    decorators resolve regardless of the guard (`TenantMiddleware` runs
    application-wide, independent of any per-route guard, the same way
    it resolves on the *unguarded* `POST /auth/login`).

  Nest resolves every guard via its own DI container by class reference;
  no explicit provider registration was needed in
  `example-domain.module.ts` for any of them (`JwtAuthGuard`'s only
  dependency, `TokenService`, and `RolesGuard`/`PermissionsGuard`'s only
  extra dependency, `AuthorizationService`, are both `@Global()`).
- `example-domain.service.ts` — `ExampleDomainService`, two placeholder
  methods: `ping(authenticatedAs: string)` (Milestone 2 — takes the
  caller's email as a plain parameter rather than reading
  `@CurrentUser()` itself, keeping the service ignorant of guards/
  decorators entirely; `ping()`/`permissionPing()` both call this same
  method, since those two routes differ only in which guard protects
  them, not in what they return), and `organization(tenantId,
  organization)` (Milestone 4 — same "controller resolves, service stays
  ignorant of guards/decorators" convention, shaping the already-resolved
  values into `OrganizationResponseDto` with no data access of its own).
- `dto/ping-response.dto.ts` — `PingResponseDto`, `{ status: 'ok',
  authenticatedAs }`. `authenticatedAs` (Milestone 2) exists solely to
  make the new guard/decorator protection independently verifiable via a
  live HTTP response, not a permanent product field. Reused as-is for
  `permission-ping` (Milestone 3) — same shape, no new DTO needed.
- `dto/organization-response.dto.ts` (new, Milestone 4) —
  `OrganizationResponseDto`, `{ tenantId, organization: { id, name,
  slug } }`. Both fields present even though `organization.id` repeats
  `tenantId` — deliberately demonstrating the two real, distinct
  decorators (`@Tenant()`'s minimal `TenantContext`, `@Organization()`'s
  richer `OrganizationContext`) doing their own separate jobs, not
  collapsed into one field.
- `constants/example-domain.constant.ts` — `EXAMPLE_DOMAIN_ROUTE`, the
  one string `@Controller()` uses.
- `example-domain.service.spec.ts` — `ping()` returns the expected DTO.
- `example-domain.controller.spec.ts` — the route resolves through Nest's
  DI container and delegates to the real service (added in this phase's
  review pass; a controller with real request/response wiring is exactly
  the part a unit-only service test doesn't exercise).
- `repositories/example.repository.ts` (Phase 1.2D.3) —
  `ExampleRepository extends BaseRepository<PrismaService['setting']>`,
  registered as a provider alongside `ExampleDomainService` so DI proves
  it resolves at boot. **Not wired into `ExampleDomainService`** — a ping
  endpoint has nothing to persist, so forcing an unused dependency into
  the service would be speculative; a real future service injects its
  module's repository the same way once it genuinely needs one. Targets
  `Setting` (the least "business-domain" model in the schema) purely to
  prove the pattern against a real Prisma delegate type — not a real
  settings feature.
- `repositories/example.repository.spec.ts` — proves the constructor
  correctly extracts `prisma.setting` and hands it to `BaseRepository`,
  using a plain fake `PrismaService`, no real Postgres involved. Also a
  compile-time-only `@ts-expect-error` test (added during this phase's
  review, matching `audit-logger.service.spec.ts`'s existing precedent)
  proving `findOne()`/`create()` actually reject a field that doesn't
  exist on `Setting` — real type safety from `Parameters<>`/
  `ReturnType<>`, not just structural acceptance of anything.

## What's deliberately empty

`entities/`, `interfaces/`, `types/`, `exceptions/`, `validators/`,
`mappers/` — each has its own README explaining what belongs there and
why nothing does yet. A ping endpoint has no data to model, no failure
case to express beyond Nest's built-ins, and no conversion to perform.

## What this module explicitly does NOT do (as of Milestone 4)

Still no validation rules, no business logic, no transactions, no query
builders, no caching, no domain-specific repositories, no ownership
checks. As of Milestone 3, `ping()`/`permission-ping()` *do* demonstrate
real role/permission gating (`RolesGuard`/`PermissionsGuard`); as of
Milestone 4, `organization()` demonstrates real tenant resolution
(`@Tenant()`/`@Organization()`) — this is deliberately the one place in
the codebase all of these are shown wired end-to-end, not scope creep;
every actual authorization/tenant-resolution *decision* still lives in
`AuthorizationService` (`apps/api/src/authorization/`) /
`TenantResolver` (`apps/api/src/tenant/`), never in this module. See
`docs/architecture/domain-module-guide.md` for the full standards a real
domain module must still follow on top of this skeleton, and
`common/guards/README.md`/`common/decorators/README.md` for what
`JwtAuthGuard`/`RolesGuard`/`PermissionsGuard`/`@CurrentUser()`/`@Roles()`/
`@Permissions()`/`@Tenant()`/`@Organization()` themselves do and don't do.
