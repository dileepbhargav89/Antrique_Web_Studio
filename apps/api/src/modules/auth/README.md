# AuthModule (Phase 1.2D.4–1.2D.10, Milestone 1 — real authentication, Milestone 2 — authorization foundation, Milestone 3 — role & permission foundation, Milestone 4 — real tenant resolution, Phase 10 Module 4 — session security)

**Changed by Phase 10, Module 4 (Authentication & Session Security) —
the biggest change to this module since Milestone 1.** Every "no
sessions, no rotation, no reuse detection, no lockout, stateless
refresh" caveat below (previously accurate through Milestone 4) is now
**closed**:

- Refresh tokens are real, persisted `Session` rows (the model existed
  in `schema.prisma` since early on, doc-commented "rotating refresh,
  reuse detection," but nothing ever read or wrote it until now — see
  the new `repositories/session.repository.ts`).
- `refresh()` **rotates**: every successful call revokes the presented
  session and issues a brand-new one (`markRotated()`); the submitted
  token cannot be reused.
- **Reuse detection**: replaying an already-rotated-away refresh token
  is treated as a theft signal — it 401s AND revokes every other active
  session for that user (`revokeAllActiveForUser()`), not just the
  replayed one.
- **Account lockout**: `User.failedLoginAttempts`/`lockedUntil`
  (new columns, migration `20260730180000_add_account_lockout`) — 5
  consecutive failed logins locks the account for 15 minutes
  (`MAX_FAILED_LOGIN_ATTEMPTS`/`ACCOUNT_LOCKOUT_DURATION_MS`,
  `constants/auth.constant.ts`); a successful login resets both.
- **Concurrent session limit**: a 6th simultaneous login for the same
  user evicts the oldest active session (`MAX_CONCURRENT_SESSIONS`).
- **Real logout**: `POST /auth/logout` now takes an optional
  `LogoutRequestDto.refreshToken` and revokes the matching session;
  still a no-op success (not an error) when no token is given, for
  backward compatibility with the old contract.
- **Session management endpoints**: `GET /auth/sessions` (list the
  caller's own active sessions) and `DELETE /auth/sessions/:id`
  ("sign out this device") — the one authenticated surface on this
  controller (`JwtAuthGuard`), everything else authenticates via the
  credential/token itself.
- JWT payloads now carry a random `jti` (`buildAuthTokenPayload`/
  `reissueAuthTokenPayload`, `mappers/auth-token-payload.mapper.ts`) —
  closes the token-collision risk those functions' own prior comments
  already flagged.
- `login()`/`refresh()` now read `@RequestMetaDecorator()`
  (`common/decorators/request-meta.decorator.ts`, new) for
  `userAgent`/`ipAddress`, recorded on the `Session` row.
- A separate, never-`$extends()`-ed `PrismaClient` (`rawTxClient` in
  `database/prisma.service.ts`) had to be introduced project-wide for
  RLS's `SET LOCAL` wiring (Module 3) — session-heavy flows like login/
  refresh/logout were exactly what surfaced the infinite-recursion bug
  that fix addresses; see `docs/architecture/security.md` §16 and
  `docs/implementation/decisions.md`.

Live-verified end to end against a real compiled server + Postgres:
login → refresh (rotation) → replay the old token (401, reuse
detected, whole session family revoked) → fresh login → logout →
replay the logged-out token (401). See `docs/implementation/decisions.md`.

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
  - `POST /auth/logout` — **Phase 10, Module 4**: real, revokes the
    session matching the given `LogoutRequestDto.refreshToken` (optional,
    a no-op success without one). Reads `@Tenant()` — `Session` rows are
    tenant-scoped.

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
    in `auth.service.spec.ts`). **Phase 10, Module 4**: no longer
    stateless — looks up the presented token's `Session` row by its
    SHA-256 hash (tenant-scoped), rejects a token with no matching
    session, rejects an expired session, and rejects (plus revokes every
    other active session for that user) a token whose session is already
    `revokedAt` — a replay of an already-rotated-away token, treated as a
    theft signal. On success, marks the presented session rotated
    (`markRotated()`) and creates a new one for the reissued pair.
  - `logout()` (**Phase 10, Module 4** — previously a placeholder) looks
    up the `Session` matching the given refresh token's hash and revokes
    it; deliberately idempotent (never throws for a missing/invalid/
    already-revoked token — logout stays a no-op success either way).
  - `listSessions(email, tenant)`/`revokeSession(id, email, tenant)`
    (**Phase 10, Module 4**, new) — list/revoke the caller's own active
    sessions only; `revokeSession()` 404s for a session that doesn't
    belong to the caller (looked up via `findActiveByIdForUser()`, scoped
    by both `userId` and `tenantId`).
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
  TokenResponseDto`, `LogoutRequestDto` (**Phase 10, Module 4**, new —
  optional `refreshToken`), `LogoutResponseDto` (**Phase 10, Module 4**:
  now a plain empty-object success acknowledgement, replacing the old
  `{ status: 'not_implemented' }` placeholder), `SessionResponseDto`
  (**Phase 10, Module 4**, new — `id`/`userAgent`/`ipAddress`/`issuedAt`/
  `lastUsedAt`/`expiresAt`; deliberately excludes `refreshTokenHash`).
  **Enforced at the HTTP boundary** by the global `ValidationPipe`
  (Phase 1.2D.5, `main.ts` — `apps/api/src/common/pipes/`), and verified
  directly via `class-validator`'s own `validate()` in `dto/*.spec.ts`
  independent of the HTTP layer.
- `types/auth-token-payload.type.ts` — `AuthTokenPayload`, the shape
  signed into every token: `{ email: string, jti: string }`. `jti`
  (**Phase 10, Module 4**, new — a fresh `randomUUID()` every time) is
  otherwise unused by this codebase (no token blacklist keys off it) —
  it exists purely so two tokens signed in the same second for the same
  email are never byte-identical, closing a token-collision risk the
  mapper's own comments had flagged since Phase 1.2D.9. No `sub`/
  `tenantId`/`roles` — none of which this module's `User` lookup result
  needs to expose in the token itself.
- `mappers/auth-token-payload.mapper.ts` — `buildAuthTokenPayload(email)`
  (Milestone 1 — changed from taking `LoginRequestDto` to a plain
  `email: string`, so `login()` can build the payload from the verified
  `user.email`, not unverified `dto.email` — see the function's own
  comment), the one place a login builds a payload.
  `reissueAuthTokenPayload(decoded)` (Phase 1.2D.9), the one place a
  verified, decoded refresh token's payload is rebuilt into a clean
  `{ email, jti }` shape before `refresh()` signs it again — both
  functions mint a fresh `jti` (**Phase 10, Module 4**), never carry the
  old one forward.
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
  be legitimately reused by a different live account. **Phase 10, Module
  4**, two new methods: `recordFailedLogin(userId, currentAttempts,
  lockUntil)` (increments `failedLoginAttempts`, sets `lockedUntil` only
  when a lock date is passed) and `recordSuccessfulLogin(userId)`
  (resets both to their defaults).
- `repositories/session.repository.ts` (**Phase 10, Module 4**, new) —
  `SessionRepository extends BaseRepository<PrismaService['session']>`,
  `Session`'s first real repository — a separate aggregate root from
  `AuthRepository`'s `User`, not methods bolted onto it. `createSession`/
  `findByRefreshTokenHash` (deliberately NOT scoped to `revokedAt: null`
  — `refresh()` needs to distinguish "unknown token" from "already
  rotated away, being replayed" from "still valid")/`markRotated`/
  `revoke`/`revokeAllActiveForUser` (the reuse-detection theft response —
  a blunt "kill every active session for this user" rather than walking
  just the specific rotation chain)/`findActiveForUser`/
  `countActiveForUser`/`findOldestActiveForUser` (concurrent-session-limit
  eviction)/`findActiveByIdForUser`.
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
  password, canonical-email-in-payload, account lockout, concurrent-
  session eviction; refresh() covered with a real `TokenService` as
  before — valid-token reissuance, invalid-signature/expired/malformed/
  access-token-as-refresh all rejected, plus **Phase 10, Module 4**:
  session lookup/rotation, reuse detection with family-wide revocation,
  expired-session rejection; logout()/listSessions()/revokeSession()
  covered similarly), `auth.controller.spec.ts` (DI-resolved via
  `Test.createTestingModule`, mocked dependencies including the new
  login 401 paths and the new session-management routes),
  `repositories/auth.repository.spec.ts` (asserts the exact tenant-scoped,
  case-insensitive `findFirst()` call shape against a fake delegate, plus
  the lockout methods), `repositories/session.repository.spec.ts`
  (**Phase 10, Module 4**, new — asserts every `SessionRepository` method
  against a fake delegate), `mappers/auth-token-payload.mapper.spec.ts`
  (covers the `jti` field), plus
  `dto/login-request.dto.spec.ts`/`dto/refresh-request.dto.spec.ts`.

## What's deliberately empty

`entities/`, `interfaces/`, `exceptions/`, `validators/` — each has its
own README explaining what belongs there and why nothing does yet,
matching `example-domain/`'s exact precedent. `types/`/`mappers/`
graduated to real content in Phase 1.2D.8 (their placeholder READMEs are
gone, matching `repositories/`'s existing precedent of no README once a
folder has real content).

## What this module explicitly does NOT do (as of Phase 10, Module 4)

No registration, no password reset, no email verification (so
"password policy" is N/A — there's no flow that ever sets a new
password), no Passport, no OAuth. `login`/`refresh`/`logout` stay
unguarded on purpose (must be reachable without a token, to obtain one)
— only `GET /auth/sessions`/`DELETE /auth/sessions/:id` are
`JwtAuthGuard`-protected. MFA has a documented no-op extension point
(`mfa-verification.util.ts`'s `verifyMfaIfEnrolled()`, called from
`login()` but currently always resolves immediately) rather than a real
implementation. No timing-attack mitigation on `login()` (a known,
accepted gap — see `auth.service.ts`'s own comment) — narrower than it
sounds: the lockout check (added this module) already means a locked
account short-circuits before any password compare, same as the
no-such-user/no-password-hash paths always have. Sessions, rotation,
reuse detection, and account lockout are now real (Phase 10, Module 4 —
see the top of this file); the only thing genuinely NOT covered by them
is a blacklist for still-valid *access* tokens (revoking a session kills
future refreshes, not an already-issued, not-yet-expired access token —
accepted given the short, 15-minute access-token TTL). Real multi-tenant
resolution is real as of Milestone 4, but lives entirely outside this
module (`apps/api/src/tenant/`) — `AuthModule` only *consumes* the
resolved `TenantContext` via `@Tenant()` in `login()`, it doesn't
resolve tenants itself. RBAC itself is real as of Milestone 3, also
living entirely outside this module — see
`apps/api/src/authorization/README.md` — `AuthModule` neither builds nor
consumes it. See `docs/architecture/domain-module-guide.md` for the full
standards this module follows.
