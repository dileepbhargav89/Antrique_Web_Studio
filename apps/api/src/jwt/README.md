# JWT module — TokenService (Phase 1.2D.6; every method has a real caller since Milestone 2)

**Infrastructure, now with a real caller on every method.**
`AuthService` (`apps/api/src/modules/auth/`) uses this module for:
`signAccessToken()`/`signRefreshToken()` on login, since Phase 1.2D.8;
`verifyRefreshToken()` — and, to reissue, `signAccessToken()`/
`signRefreshToken()` again — on refresh, since Phase 1.2D.9. See
`apps/api/src/modules/auth/README.md`. `verifyAccessToken()` — the one
method left uncalled through Phase 1.2D.10 — finally has a caller too:
`JwtAuthGuard` (`apps/api/src/common/guards/jwt-auth.guard.ts`,
Milestone 2), the cross-cutting guard that protects any route it's
attached to, calls it on every request to a guarded endpoint. `POST
/auth/logout` remains a `{ status: 'not_implemented' }` placeholder.
This module was originally built (Phase 1.2D.6) so the capability would
already be real and tested by the time real callers landed.

## What's real here

- `config/jwt.config.ts` — the `jwt` namespace (`accessSecret`,
  `accessTokenTtl`, `refreshSecret`, `refreshTokenTtl`), assembled from
  the newly-validated `JWT_ACCESS_SECRET`/`JWT_ACCESS_TOKEN_TTL`/
  `JWT_REFRESH_SECRET`/`JWT_REFRESH_TOKEN_TTL` env vars
  (`env.validation.ts`, Phase 1.2D.6). Registered via
  `ConfigModule.forFeature()` inside `token.module.ts`, not the frozen
  `config.module.ts` — the same graduation path
  `logging/config/logger-options.config.ts` already established. **Not**
  the same as `apps/api/src/config/auth/`, which stays an unvalidated
  placeholder reserved for managed IdP settings.
- `token.module.ts` — `TokenModule`, `@Global()` (matching `ConfigModule`/
  `LoggingModule`/`DatabaseModule`'s precedent). Named `TokenModule`, not
  `JwtModule` — `@nestjs/jwt`'s own `JwtModule` (configured here via
  `registerAsync()` with the access token's secret/expiration as the
  default `signOptions`) already has that name; reusing it produced two
  identical "JwtModule dependencies initialized" boot log lines, caught
  live and fixed. `TokenService` overrides `secret`/`expiresIn` per call
  for refresh tokens, the standard `@nestjs/jwt` pattern for two token
  types with different secrets from one `JwtService`. Exports
  `TokenService` only.
- `token.service.ts` — `TokenService`, constructor-injects `@nestjs/jwt`'s
  `JwtService` and the validated `jwt` config — never `process.env`
  directly. Named `TokenService`, not `JwtService`: that name is already
  `@nestjs/jwt`'s own class. Four methods, all genuinely functional
  (verified in `token.service.spec.ts`, not stubbed):
  `signAccessToken(payload)`, `signRefreshToken(payload)`,
  `verifyAccessToken<T>(token)`, `verifyRefreshToken<T>(token)`. Access
  and refresh tokens use **different secrets**, so a leaked/misused
  refresh token can never be verified as an access token or vice versa —
  confirmed live in the test suite, not just asserted. `verify*` methods
  throw `@nestjs/jwt`'s own `JsonWebTokenError`/`TokenExpiredError` on
  invalid/expired input, uncaught — deciding how to handle that (a custom
  exception? a guard?) is a future phase's job, not infrastructure's.
- `signAccessToken`/`signRefreshToken` accept a plain `object` — this
  module itself fixes no payload shape. Since Phase 1.2D.8,
  `AuthService.login()`'s own minimal `{ email }` shape
  (`modules/auth/types/auth-token-payload.type.ts`) is the one real
  payload signed today; a richer shape (`sub`, `tenantId`, roles) is
  still a real-authentication/persistence decision, out of scope here
  and there.
- Two security properties confirmed live during this phase's own review,
  then added as permanent regression tests: signing defaults to `HS256`
  (not an attacker-selectable algorithm), and a hand-crafted `alg: none`
  token — the classic JWT algorithm-confusion forgery — is correctly
  rejected by `@nestjs/jwt`'s `verify()`.

## How every method finally got a real caller

Every phase in this arc (`BaseRepository`/`ExampleRepository`,
`PrismaService`, the global `ValidationPipe`) built genuinely working
capability before wiring it into a live user-facing flow, proven by
tests and DI resolution rather than by an HTTP endpoint. `TokenService`
followed the same discipline through Phase 1.2D.6/1.2D.7: real,
round-trip-tested sign/verify behavior, registered and DI-resolvable
(`TokenModule` is imported into `AppModule`), with no caller yet.
Phase 1.2D.8 gave `signAccessToken()`/`signRefreshToken()` a real
caller — `AuthService.login()` issues both tokens on every login. Phase
1.2D.9 gave `verifyRefreshToken()` one too — `AuthService.refresh()`
verifies the submitted refresh token, and (via the same two `sign*`
methods) issues a fresh pair on success, `401` on any failure.
Milestone 2 gave `verifyAccessToken()` its own: `JwtAuthGuard` calls it
on every request to a route it protects — the same "no separate branch
needed" pattern already established elsewhere (a refresh token presented
here fails for the identical reason it fails in `AuthService.refresh()`'s
reverse case: wrong secret, same signature check, no special-cased
detection required).

## What this module itself does NOT do (as of Milestone 2)

No refresh-token storage/rotation tracking/revocation/blacklist, no
Passport (`JwtAuthGuard` is a hand-written `CanActivate`, not
`@nestjs/passport`), no RBAC, no sessions, no OAuth, no MFA, no
registration, no password hashing (that's `password/`'s job — see
`password/README.md`), no user authentication logic (that's
`AuthService`'s job — see `modules/auth/README.md`).
