# TenantModule (Milestone 4 — Organization & Multi-Tenant Foundation)

Replaces the fixed `DEFAULT_TENANT_ID` stopgap (Milestones 1–3) with real,
request-based tenant resolution, while preserving everything those
milestones built on top of it: authentication (`modules/auth/`) and RBAC
(`authorization/`, `common/guards/`) now receive a **resolved** tenant
per request instead of a hardcoded constant, with the same constant kept
alive only as a narrow, explicitly gated development fallback.

"Organization" is this milestone's name for what `schema.prisma` already
models as `Tenant` (the platform's own multi-tenancy isolation boundary,
`CLAUDE.md`'s "tenant_id spine") — there is no separate `Organization`
table, and this milestone's own "Do NOT Implement: Organization CRUD"
confirms none should be added. `OrganizationRepository` is a thin,
purpose-named wrapper over `Tenant`, not a new entity — see
`repositories/organization.repository.ts`'s own comment.

## What's real here

- `tenant-resolver.service.ts` — `TenantResolver`, the resolution LOGIC
  only (no attachment to `request` — that's `middleware/
  tenant.middleware.ts`'s job). `resolve(request)` tries, in order, first
  match wins, each candidate independently validated against the
  database (a candidate that isn't a real active tenant is treated
  exactly like "no candidate," never trusted blindly):
  1. **Hostname** — the leftmost label of a ≥3-label, non-IP hostname,
     treated as a candidate `Tenant.slug` (`acme.antrique.app` → `acme`).
     No dedicated domain/hostname column exists on `Tenant` (Phase
     1.1A, unchanged — no schema change this milestone); subdomain-
     matching against the existing `slug` is what "if configured" means
     in practice, not a separate feature flag.
  2. **`X-Tenant-ID` header** (development/testing) — the tenant's real
     `id` (UUID).
  3. **`DEFAULT_TENANT_ID`** (`config/default-tenant.config.ts`) —
     gated strictly on `nodeEnv === 'development'`; confirmed live that
     `test`/`production` requests reaching this point with nothing else
     resolved get a `400`, not a silent default.

  Unresolved → throws `BadRequestException('Tenant could not be
  resolved')`. `extractHostnameSlugCandidate()` is exported standalone
  for direct unit testing, the same reasoning `jwt-auth.guard.ts`'s
  `extractBearerToken()` was.

- `middleware/tenant.middleware.ts` — `TenantMiddleware`, the
  orchestration half: calls `TenantResolver.resolve()` exactly once,
  then attaches BOTH derived views to `request` in one pass —
  `tenantContext` (`{ tenantId }`, minimal, for query-scoping) and
  `organizationContext` (`{ id, name, slug }`, richer, for display) —
  both `Object.freeze()`d, genuinely immutable at runtime (mirroring
  `JwtAuthGuard`'s identical treatment of `request.user`). This is what
  "tenant resolution occurs once per request" means in practice: one
  resolution, two attached views, not two lookups.

  Registered via `TenantModule`'s own `NestModule.configure()` +
  `MiddlewareConsumer.forRoutes('*')` — **not** raw `app.use()` in
  `main.ts` like `HttpLoggingMiddleware`. This was a deliberate choice,
  confirmed live: a `BadRequestException` thrown here needs to reach
  Nest's own exception-filter pipeline (`ExceptionLoggingFilter`,
  `APP_FILTER`) to produce a clean `400` JSON response instead of a hang
  or Express's default HTML error page — confirmed by booting with
  `NODE_ENV=production` and no hostname/header hint: the response was
  `{"message":"Tenant could not be resolved","error":"Bad
  Request","statusCode":400}`, and the SAME `requestId`/`correlationId`
  appeared in both the `ExceptionLoggingFilter`'s log line and the
  `HttpLoggingMiddleware` completion log, proving the whole pipeline
  actually connects. `use()` itself uses an explicit `try`/`catch` +
  `next(error)`, not a bare `await` inside an `async` middleware method —
  Express 4 (this app's platform) does not automatically catch a
  rejected promise from middleware.

- `repositories/organization.repository.ts` — `OrganizationRepository
  extends BaseRepository<PrismaService['tenant']>`. Two methods,
  `findActiveBySlug(slug)`/`findActiveById(id)`, both folding "validate
  organization is active" into the query itself (`status: ACTIVE`,
  `deletedAt: null`) rather than a separate boolean check callers would
  have to remember to call.

- `tenant.module.ts` — `TenantModule`, **not** `@Global()` (unlike
  `TokenModule`/`PasswordModule`/`AuthorizationModule`): nothing outside
  this module injects `TenantResolver`/`OrganizationRepository`
  directly — every consumer reads the already-resolved
  `request.tenantContext`/`request.organizationContext` via
  `common/decorators/tenant.decorator.ts`/`organization.decorator.ts`
  instead. Only needs to be imported into `AppModule` so its own
  `configure()` runs.

- `config/default-tenant.config.ts` — the `defaultTenant` namespace,
  **relocated here this milestone** from `modules/auth/config/`. Through
  Milestone 3, `AuthRepository`/`RoleRepository`/`PermissionRepository`
  all injected it directly as a stopgap; Milestone 3's own decision
  record explicitly declined to relocate it then, reasoning that two
  consumers sharing one `ConfigModule.forFeature()` factory was normal
  and relocating for two would be premature. This milestone changes that:
  all three repositories now take `tenantId` as a plain method parameter
  instead, so this file's only remaining consumer is `TenantResolver`
  (as the **development-only fallback** source) — a genuine, single,
  non-cosmetic owner, which is what makes relocating the right call this
  time. See `docs/implementation/decisions.md`.

## Who reads `request.tenantContext`/`request.organizationContext`

- `common/decorators/tenant.decorator.ts` (`@Tenant()`) /
  `organization.decorator.ts` (`@Organization()`) — the same
  `createParamDecorator()` + standalone-exported-extraction-function
  pattern `@CurrentUser()` already established. Unlike `@CurrentUser()`
  (only resolves on a route also guarded by `JwtAuthGuard`), these
  resolve on **any** route, authenticated or not — `TenantMiddleware`
  runs application-wide, independent of per-route guards.
- `modules/auth/auth.controller.ts`'s `login()` — reads `@Tenant()`,
  passes `tenantId` to `AuthService.login()`, which passes it to
  `AuthRepository.findActiveByEmail()`. `refresh()`/`logout()`
  deliberately do NOT take a tenant — neither looks up a user by email.
- `common/guards/roles.guard.ts`/`permissions.guard.ts` — read
  `request.tenantContext` directly (not via the decorator — guards run
  before `@Tenant()`'s param-decorator machinery would resolve) and pass
  `tenantId` to `AuthorizationService`, which now resolves roles/
  permissions **within the resolved tenant**, not a fixed default.
- `modules/example-domain/example-domain.controller.ts`'s
  `GET /example/organization` (new, this milestone) — the reference
  endpoint for both decorators, protected by `JwtAuthGuard` only (no
  RBAC check layered on top — demonstrating tenant resolution doesn't
  need one).

## What this module explicitly does NOT do

No `Organization` CRUD, no invitation system, no organization-switching
UI, no subscription/billing, no tenant-creation API, no RLS session-
variable wiring (the existing application-level `WHERE tenantId = X`
filtering — now sourced from `TenantContext` instead of a hardcoded
default — remains the primary enforcement mechanism; RLS stays the
documented backstop, `CLAUDE.md`'s "RLS is the backstop, not the only
gate"), no multi-tenant *membership* (a `User` still belongs to exactly
one `Tenant` via a direct FK, not a many-to-many join table — "user
organization membership" in this milestone's brief is satisfied by the
existing tenant-scoped `WHERE tenantId = X` filter on `AuthRepository`'s
own query, not a new membership table; see
`docs/implementation/decisions.md`), no changes to `JwtAuthGuard` or the
JWT payload (both explicitly out of scope this milestone — tenant flows
through a separate request property, never the token).
