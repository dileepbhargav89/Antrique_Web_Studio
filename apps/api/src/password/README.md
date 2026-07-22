# Password module — PasswordService (Phase 1.2D.7; real caller since Milestone 1)

**Infrastructure with a real caller.** `AuthService.login()`
(`apps/api/src/modules/auth/`) calls `PasswordService.compare()` on
every login attempt, verifying the submitted password against the
user's stored Argon2id `passwordHash` (looked up via
`AuthRepository.findActiveByEmail()`, tenant-scoped). No such user, no
`passwordHash` set (an IdP-only account), or a wrong password all return
an identical `401` — see `modules/auth/README.md`'s `login()` walkthrough
for the full flow. `hash()` is called from `prisma/seed.ts` (not
`PasswordService` itself — the seed script has no NestJS DI, so it calls
`@node-rs/argon2` directly with the same parameters) to give the seeded
`admin@antrique.dev` user a real password to log in with. Still no
registration, no password reset — nothing in the application itself
calls `hash()` yet, only the seed script.

## What's real here

- `config/hash.config.ts` — the `hash` namespace (`memoryCost`,
  `timeCost`, `parallelism`), assembled from the newly-validated
  `HASH_MEMORY_COST`/`HASH_TIME_COST`/`HASH_PARALLELISM` env vars
  (`env.validation.ts`, Phase 1.2D.7). Registered via
  `ConfigModule.forFeature()` inside `password.module.ts`, not the frozen
  `config.module.ts` — the same graduation path `jwt/config/jwt.config.ts`
  already established. Named `hash`, not `password`: this is Argon2
  algorithm tuning, not password business policy (minimum length, reuse
  rules, etc.) — a distinct, still-unbuilt concern.
- `password.module.ts` — `PasswordModule`, `@Global()` (matching
  `ConfigModule`/`LoggingModule`/`DatabaseModule`/`TokenModule`'s existing
  precedent). Exports `PasswordService` only.
- `password.service.ts` — `PasswordService`, constructor-injects the
  validated `hash` config — never `process.env` directly. Two methods,
  both genuinely functional (verified in `password.service.spec.ts`, not
  stubbed): `hash(plaintext)` and `compare(plaintext, hashed)`.
  - `hash()` produces a real, Argon2id-encoded PHC string (e.g.
    `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<digest>`) using a
    cryptographically random salt per call — hashing the same plaintext
    twice produces two different hashes, confirmed live in the test
    suite, not just asserted.
  - `compare()` delegates directly to the underlying library's own
    constant-time verification; no custom comparison logic sits on top.
    The cost parameters and salt travel inside the hash string itself, so
    a hash produced under an older `HASH_MEMORY_COST`/`HASH_TIME_COST`/
    `HASH_PARALLELISM` value still verifies correctly after those env
    vars change — also confirmed live in the test suite.
- The Argon2 **variant** is hardcoded to `argon2id` in `password.service.ts`,
  not read from config — the same "not configurable" treatment already
  applied to the JWT signing algorithm (`HS256`, fixed in
  `token.service.ts`). Only the cost parameters above are
  environment-tunable; the variant itself staying fixed avoids an
  environment ever silently weakening to `argon2i`/`argon2d`.

## Library choice: @node-rs/argon2, not `argon2`

The brief calls for Argon2; the natural npm package is `argon2`
(node-argon2), but installing it on this machine failed:
`pnpm add argon2` invoked node-gyp, which requires a Visual Studio C++
build toolchain (`Desktop development with C++` workload) that isn't
present in this environment, and no prebuilt binary was available for
this Node version/platform combination either. `@node-rs/argon2` (napi-rs
bindings around the same underlying Rust `argon2` crate) ships a
prebuilt native binary and installed with no compilation step. Its
functional API (`hash()`/`verify()`, no exported class) also carries no
naming-collision risk with `PasswordService`/`PasswordModule`, the same
check that caught the `TokenService`/`JwtService` and
`TokenModule`/`JwtModule` collisions in Phase 1.2D.6.

## Why it took until Milestone 1 to get a real call site

Every phase in this arc (`BaseRepository`/`ExampleRepository`,
`PrismaService`, `TokenService`) built genuinely working capability
before wiring it into a live user-facing flow, proven by tests and DI
resolution rather than by an HTTP endpoint. `PasswordService` followed
the same discipline through Phases 1.2D.7–1.2D.10: real, round-trip-tested
hash/compare behavior, registered and DI-resolvable, and — since Phase
1.2D.8 — constructor-injected into `AuthService`, but not called: calling
`compare()` needs a persisted password hash to compare against, which
needed both a real `User` query (blocked on tenant resolution since
Phase 1.2D.4) and a `passwordHash` column that didn't exist on `User` at
all until Milestone 1 added it (the original schema was IdP-only — see
`modules/auth/README.md`'s top summary and
`docs/implementation/decisions.md`). Phase 1.2D.8 explicitly considered
and rejected two ways to give `compare()` a call site without solving
either blocker first — a hardcoded demo password hash (a real bypass
credential embedded in source), or hashing the submitted password and
immediately comparing it to itself (a check that "verifies" any
well-formed input unconditionally) — both worse than not verifying at
all. Milestone 1 solved the actual blockers instead of routing around
them: a `defaultTenant` config stopgap (tenant-scoped, not skipped) and
a real `passwordHash` column, both explicit, reviewed decisions, not
silent scope expansion.
`PasswordService` itself still has no dependency on `AuthService`,
`AuthRepository`, `TokenService`, or anything else in `auth/`/`jwt/` —
the dependency runs the other way (`AuthService` depends on
`PasswordService`, not vice versa) — confirmed by import trace, not just
by convention.

## What this module explicitly does NOT do

No login logic (that's `AuthService`'s job — this module only hashes and
compares), no registration, no password reset, no JWT integration, no
guards, no Passport, no RBAC, no sessions, no OAuth, no MFA.
