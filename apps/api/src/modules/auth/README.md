# AuthModule (Phase 1.2D.4–1.2D.10, Milestone 1 — real authentication, Milestone 2 — authorization foundation, Milestone 3 — role & permission foundation, Milestone 4 — real tenant resolution)

**Unchanged by Milestone 3.** `AuthModule`/`AuthController`/`AuthService`/
`AuthRepository` were byte-for-byte the same as Milestone 2 left them —
that milestone's only addition here was `constants/role.constant.ts`/
`constants/permission.constant.ts` (see below), plain data, no behavior.
The real RBAC infrastructure (`RoleRepository`/`PermissionRepository`/
`AuthorizationService`/`RolesGuard`/`PermissionsGuard`) lives in
`apps/api/src/authorization/` and `common/guards/`/`common/decorators/`
instead — see `apps/api/src/authorization/README.md`.

**Changed by Milestone 4 (Organization & Multi-Tenant Foundation) —
narrowly, on purpose.** `login()` now takes a resolved `TenantContext`
(read via `@Tenant()` in `auth.controller.ts`) instead of
`AuthRepository` injecting a fixed `DEFAULT_TENANT_ID` config value
itself. `refresh()`/`logout()` are untouched — neither looks up a user by
email, so neither needs a tenant. This milestone's own requirement
scoped the change to exactly this: "Update AuthRepository login lookup to
use TenantContext instead of DEFAULT_TENANT_ID configuration." See
"What's real here" below and `apps/api/src/tenant/README.md` for where
tenant resolution itself now lives.

The first real (non-reference) business module, built on
`modules/example-domain/`'s template — see
`docs/architecture/domain-module-guide.md`. As of Milestone 1,
`POST /auth/login` performs real authentication: it looks up the
submitted email (tenant-scoped, now via a genuinely resolved tenant —
Milestone 4), verifies the password against a stored Argon2id hash, and
returns real access + refresh tokens on success or a `401` on any
failure. `POST /auth/refresh` verifies a submitted refresh token and
reissues a fresh pair (Phase 1.2D.9/1.2D.10 — unchanged since). `POST
/auth/logout` remains a placeholder. None of `AuthController`'s own
routes are `JwtAuthGuard`-guarded — `login`/`refresh` must stay reachable
without a token to obtain one, and `logout` isn't implemented yet — but
`TenantMiddleware` (`apps/api/src/tenant/`) DOES run in front of every
route including these (it's middleware, not a per-route guard); Milestone
2's `JwtAuthGuard`/`@CurrentUser()` (`apps/api/src/common/guards/`,
`common/decorators/`) protect routes *elsewhere* using the `TokenService`
this module's own `login()`/`refresh()` already depend on. No
registration, no password reset, no email verification, no refresh-token
storage/rotation/revocation/blacklist, no sessions, no OAuth, no MFA. Two
independent, optional credential paths exist on `User` — a local Argon2id
password (Milestone 1) and a managed-IdP link (`idpSubject`, still
unbuilt) — per `docs/architecture/security.md`'s "Auth" line.

## What's real here

- `auth.module.ts` — `AuthModule`, imported into `AppModule`. Not
  `@Global()`. No provider is exported — nothing outside this module
  needs one yet. `TokenService`/`PasswordService` are injected into
  `AuthService` without this module importing `TokenModule`/
  `PasswordModule` itself — both are `@Global()` (Phases 1.2D.6/1.2D.7),
  already imported once into `AppModule`. **No longer imports
  `ConfigModule.forFeature(defaultTenantConfig)`** (Milestone 4 — that
  config, relocated to `apps/api/src/tenant/config/`, is consumed
  exclusively by `TenantResolver` now; `AuthRepository` takes `tenantId`
  as a plain method parameter instead).
- `auth.controller.ts` — `AuthController`:
  - `POST /auth/login` (`/api/v1/auth/login` once the global prefix/
    versioning apply) — real authentication; returns
    `{ accessToken, refreshToken }` or `401`. Reads `@Tenant()`
    (`common/decorators/tenant.decorator.ts`, Milestone 4) — the
    request's already-resolved `TenantContext` — and passes it to
    `AuthService.login()`. Not `@Req()`: matches this codebase's
    established "decorator over raw request access" convention
    (`@CurrentUser()`).
  - `POST /auth/refresh` — verifies the submitted token and returns a
    fresh real `{ accessToken, refreshToken }`, or `401` if invalid. Does
    NOT take `@Tenant()` — it never looks up a user by email, only
    verifies/reissues a JWT, so it needs no tenant scoping.
  - `POST /auth/logout` — still `{ status: 'not_implemented' }`, also no
    `@Tenant()`.

  No controller changes were needed for either `401` path: an
  `UnauthorizedException` thrown from `AuthService.login()`/`.refresh()`
  propagates through Nest's default exception handling exactly like
  `ValidationPipe`'s `BadRequestException` already does — `@HttpCode(200)`
  only governs the success response, not a thrown exception's own status.

  Each route is `@HttpCode(HttpStatus.OK)` — Nest's default for `@Post()`
  is `201 Created`, correct for routes that create a resource, which
  none of these do (caught live during Phase 1.2D.4's own validation).
- `auth.service.ts` — `AuthService`, constructor-injects
  `AuthRepository`, `TokenService` (Phase 1.2D.6), and `PasswordService`
  (Phase 1.2D.7) — never `PrismaService` directly.
  - `login(dto, tenant)` (Milestone 1, tenant-parameterized since
    Milestone 4) is real, end to end:
    1. `AuthRepository.findActiveByEmail(dto.email, tenant.tenantId)` —
       tenant-scoped by the caller-supplied, request-resolved `tenantId`
       (Milestone 4 — see `apps/api/src/tenant/README.md`; was a fixed
       `DEFAULT_TENANT_ID` stopgap through Milestone 3), case-insensitive,
       excludes soft-deleted rows.
    2. If no user, or the user has no `passwordHash` set (an IdP-only
       account — `passwordHash` is nullable), throws `UnauthorizedException`
       immediately. Known, accepted gap: this early return is faster
       than a real `compare()` call, so response *timing* alone could
       theoretically distinguish "no such user" from "wrong password"
       for an attacker with a precise enough clock — lower severity than
       a differently-*shaped* response (which this method avoids: both
       failure paths throw the identical `UnauthorizedException`).
       Closing the timing gap needs a constant-time decoy comparison,
       deliberately not added speculatively.
    3. `PasswordService.compare(dto.password, user.passwordHash)` —
       genuinely called, no longer "registered but unwired." A mismatch
       throws the identical `UnauthorizedException` — the response never
       reveals whether the email or the password was wrong.
    4. On success, signs a token pair from `user.email` (the verified,
       canonically-cased row the case-insensitive lookup found) — *not*
       `dto.email` (the client's raw, possibly differently-cased input);
       see `mappers/auth-token-payload.mapper.ts`'s own comment.
  - `refresh()` (Phase 1.2D.9; rotation formalized Phase 1.2D.10,
    unchanged by this milestone) verifies the submitted
    `RefreshRequestDto.refreshToken` via `TokenService.verifyRefreshToken()`.
    Any failure — invalid signature, expired, malformed, or an access
    token submitted as a refresh token (fails the same signature check,
    no separate case needed) — is caught in one blanket `catch` and
    rethrown as `UnauthorizedException`, deliberately undifferentiated.
    On success, rebuilds a clean payload
    (`mappers/auth-token-payload.mapper.ts`'s `reissueAuthTokenPayload()`)
    and signs a completely fresh pair — every successful call reissues,
    never re-validates and hands back the same tokens (proven by a spy
    in `auth.service.spec.ts`). Stateless: no rotation storage, no
    revocation, no blacklist — the same refresh token can be submitted
    more than once and keeps succeeding until it naturally expires.
  - `logout()` is an unchanged placeholder — no session/token to
    invalidate without a persisted store, explicitly out of scope.
- `config/default-tenant.config.ts` — **relocated to
  `apps/api/src/tenant/config/default-tenant.config.ts` in Milestone 4**;
  this module no longer has a `config/` folder. Through Milestone 3, the
  `defaultTenant` namespace (`{ id }`, assembled from the
  `DEFAULT_TENANT_ID` env var) was registered here and injected directly
  into `AuthRepository`/`RoleRepository`/`PermissionRepository` as a
  stopgap — no subdomain/header-based tenant-resolution mechanism existed
  yet. Milestone 4 built real resolution (`apps/api/src/tenant/
  tenant-resolver.service.ts`) and narrowed this config to its one
  remaining, genuine role: the **development-only** fallback
  `TenantResolver` falls back to when neither hostname nor
  `X-Tenant-ID` header resolves — see `apps/api/src/tenant/README.md`
  and `docs/implementation/decisions.md`.
- `dto/` — `LoginRequestDto` (`@IsEmail()` email, `@IsString()
  @MinLength(1)` password), `RefreshRequestDto` (`@IsString()
  @MinLength(1)` refreshToken), `TokenResponseDto` (`accessToken`,
  `refreshToken` — Phase 1.2D.8, the shared shape any token-issuing
  endpoint returns), `LoginResponseDto`/`RefreshResponseDto extends
  TokenResponseDto`, `LogoutResponseDto` (still
  `{ status: 'not_implemented' }`) — no `LogoutRequestDto`, since
  there's no session/token to reference in a request body yet.
  **Enforced at the HTTP boundary** by the global `ValidationPipe`
  (Phase 1.2D.5, `main.ts` — `apps/api/src/common/pipes/`), and verified
  directly via `class-validator`'s own `validate()` in `dto/*.spec.ts`
  independent of the HTTP layer.
- `types/auth-token-payload.type.ts` — `AuthTokenPayload`, the shape
  signed into every token: `{ email: string }`. Deliberately minimal —
  no `sub`/`tenantId`/`roles`, none of which this milestone's `User`
  lookup result needs to expose in the token itself.
- `mappers/auth-token-payload.mapper.ts` — `buildAuthTokenPayload(email)`
  (Milestone 1 — changed from taking `LoginRequestDto` to a plain
  `email: string`, so `login()` can build the payload from the verified
  `user.email`, not unverified `dto.email` — see the function's own
  comment), the one place a login builds a payload.
  `reissueAuthTokenPayload(decoded)` (Phase 1.2D.9), the one place a
  verified, decoded refresh token's payload is rebuilt into a clean
  `{ email }` shape before `refresh()` signs it again.
- `repositories/auth.repository.ts` — `AuthRepository extends
  BaseRepository<PrismaService['user']>`, constructor-injects only
  `PrismaService` (Milestone 4 — no longer also injects a config
  namespace). Inherits `findOne`/`findMany`/`create`/`update`/`delete`
  from `BaseRepository` plus one real custom method (Milestone 1):
  `findActiveByEmail(email, tenantId)` — `findFirst({ where: { email: {
  equals, mode: 'insensitive' }, tenantId, deletedAt: null } })`, where
  `tenantId` is now a plain parameter the caller (`AuthService.login()`)
  supplies from the request's resolved `TenantContext`. Case-insensitive
  to match the database's own uniqueness guarantee
  (`users_tenant_id_email_key` is `(tenant_id, LOWER(email)) WHERE
  deleted_at IS NULL` — see the `partial_unique_indexes` migration and
  `prisma/seed.ts`'s header comment for the underlying landmine);
  `deletedAt: null` excludes soft-deleted users, whose email may already
  be legitimately reused by a different live account.
- `prisma/schema.prisma`'s `User` model (Milestone 1) — added
  `passwordHash String? @map("password_hash")`; `idpSubject` became
  optional (`String?`, was required). New migration:
  `20260720095236_add_password_hash_to_users` — hand-written, not
  `prisma migrate dev`'s raw auto-diff, which also proposed re-adding a
  plain (non-partial) unique index on `(tenant_id, email)` that would
  have collided with/undermined the existing case-insensitive partial
  index — the exact, documented landmine the `partial_unique_indexes`
  migration's own header comment warns every future migration touching
  `users` to check for and drop. See the migration file's own comment
  and `docs/implementation/decisions.md`.
- `prisma/seed.ts` — the seeded `admin@antrique.dev` user gets a real
  Argon2id `passwordHash` (dev-only password, see the script's own
  comment), hashed directly via `@node-rs/argon2` (the script has no
  NestJS DI to inject `PasswordService` with — see the script's header).
  Always re-set on every seed run, not only when missing, so
  `admin@antrique.dev` / the seed's documented dev password reliably
  works after any reseed. **Milestone 3** generalized this into a loop
  over 4 seed users (`admin@antrique.dev`, `superadmin@antrique.dev`,
  `manager@antrique.dev`, `customer@antrique.dev`, one per RBAC tier this
  milestone validates against) and added 3 roles (`super_admin`,
  `manager`, `customer`) alongside the original 4 — see
  `docs/architecture/database-schema.md` §10 and
  `apps/api/src/authorization/README.md`.
- `constants/role.constant.ts`/`constants/permission.constant.ts` (new,
  Milestone 3) — `ROLE`/`PERMISSION`, plain string-key constant objects
  for the role/permission keys real code actually references (not an
  exhaustive mirror of the seeded catalog — role/permission lookup stays
  database-driven). Used by `modules/example-domain/
  example-domain.controller.ts`'s `@Roles()`/`@Permissions()` calls.
- Every real file above has a matching `.spec.ts`: `auth.service.spec.ts`
  (login() covered with a **real** `PasswordService` — genuine Argon2id
  hash/compare, not a mock, proving the actual verification logic works:
  valid login, wrong password, no such user, IdP-only account with no
  password, canonical-email-in-payload; refresh() covered with a real
  `TokenService` as before — valid-token reissuance,
  invalid-signature/expired/malformed/access-token-as-refresh all
  rejected, rotation/statelessness properties),
  `auth.controller.spec.ts` (DI-resolved via `Test.createTestingModule`,
  mocked dependencies including the new login 401 paths),
  `repositories/auth.repository.spec.ts` (asserts the exact tenant-scoped,
  case-insensitive `findFirst()` call shape against a fake delegate),
  `mappers/auth-token-payload.mapper.spec.ts`, plus
  `dto/login-request.dto.spec.ts`/`dto/refresh-request.dto.spec.ts`.

## What's deliberately empty

`entities/`, `interfaces/`, `exceptions/`, `validators/` — each has its
own README explaining what belongs there and why nothing does yet,
matching `example-domain/`'s exact precedent. `types/`/`mappers/`
graduated to real content in Phase 1.2D.8 (their placeholder READMEs are
gone, matching `repositories/`'s existing precedent of no README once a
folder has real content).

## What this module explicitly does NOT do (as of Milestone 4)

No registration, no password reset, no email verification, no real
`POST /auth/logout` logic, no guards on `AuthController`'s own routes
(`JwtAuthGuard`/`RolesGuard`/`PermissionsGuard` protect other modules'
routes, not this one's — see `common/guards/README.md`), no Passport, no
sessions, no OAuth, no MFA, no refresh-token storage/revocation/
blacklist, no reuse detection (the same refresh token can be submitted
more than once), no timing-attack mitigation on `login()` (a known,
accepted gap — see `auth.service.ts`'s own comment). Real multi-tenant
resolution is real as of Milestone 4, but lives entirely outside this
module (`apps/api/src/tenant/`) — `AuthModule` only *consumes* the
resolved `TenantContext` via `@Tenant()` in `login()`, it doesn't
resolve tenants itself. RBAC itself is real as of Milestone 3, also
living entirely outside this module — see
`apps/api/src/authorization/README.md` — `AuthModule` neither builds nor
consumes it. See `docs/architecture/domain-module-guide.md` for the full
standards this module follows.
