# Configuration Architecture (Phase 1.2B.1)

Companion to `backend.md` §4's short pointer — this doc is the source of
truth for how `apps/api/src/config/` is organized, the conventions every
future config domain follows, and how config flows through the app at
runtime. Same relationship `database-schema.md` has to `database.md`.

**Status:** 8 real namespaces (`app`, `database`, `security`, `logging`,
`swagger`, `health`, `cache`, `queue` — Phase 1.2B.3), 10 still placeholder.
Env validation covers every real namespace's fields — see
`docs/architecture/validation.md` (Phase 1.2B.2/1.2B.3). For usage
examples, troubleshooting, and the step-by-step extension process, see
`docs/architecture/configuration-guide.md` (Phase 1.2B.4) — this doc stays
the architecture/conventions reference, that one is the practical how-to.
See "Deferred" at the end.

## 1. Folder structure

```
apps/api/src/config/
  index.ts                Central barrel — the one import path every
                           application module uses for config.
  config.module.ts         Global ConfigModule.forRoot() wiring.
  env.validation.ts        Zod schema + validateEnv() — see validation.md.
  app/                     REAL  nodeEnv, port, logLevel, corsAllowedOrigins.
    app.config.ts
    index.ts
  database/                REAL  Connection string + ssl flag, DATA ONLY —
    database.config.ts       no Prisma import, no client, no connection.
    index.ts
  security/                REAL  rateLimitWindowMs, rateLimitMax.
    security.config.ts
    index.ts
  logging/                 REAL  format (json/pretty) — LOG_LEVEL itself
    logging.config.ts        stays under `app`, not duplicated here.
    index.ts
  swagger/                 REAL  enabled, path — config only, no Swagger
    swagger.config.ts        UI wired up yet.
    index.ts
  health/                  REAL  path — config only, no health-check
    health.config.ts         controller wired up yet. Distinct from
    index.ts                 apps/api/src/health/ (the future controller's
                              home, still a placeholder).
  cache/                   REAL  redisUrl — same source as queue/, two
    cache.config.ts           distinct namespaces (§5).
    index.ts
  queue/                   REAL  redisUrl — same source as cache/.
    queue.config.ts
    index.ts
  auth/            PLACEHOLDER  IdP/JWT/session config.
  storage/         PLACEHOLDER  Object storage (bucket/region/credentials).
  email/           PLACEHOLDER  ESP transport config.
  notifications/   PLACEHOLDER  Dispatch-channel config.
  payments/        PLACEHOLDER  Hosted gateway keys.
  ai/              PLACEHOLDER  AI provider config.
  search/          PLACEHOLDER  Search provider config.
  analytics/       PLACEHOLDER  Analytics provider config.
  feature-flags/   PLACEHOLDER  Flag provider config.
  monitoring/      PLACEHOLDER  Sentry/OTel config.
```

"Placeholder" means the same thing it means everywhere else in this repo
(the convention Phase 0 set for `common/`/`jobs/`/`modules/*/`, extended by
Phase 1.2A to `database/`/`health/`/`shared/`/`types/`/`utils/`): a folder
with one README describing its purpose, zero code. These 10 stay
placeholders because they're third-party product/vendor integrations that
don't exist yet (Phase 1.2B.3's brief: "do not create speculative
configuration for future products or integrations") — unlike the 6 domains
graduated this phase, which are platform-internal infrastructure with
genuine, if minimal, content today.

**A 9th real namespace, `loggerOptions`, exists outside this folder
entirely.** `apps/api/src/logging/config/logger-options.config.ts`
(Phase 1.2C.2) registers it via `ConfigModule.forFeature()` from within
`LoggingModule`, not via this folder's frozen `config.module.ts`
`forRoot()` call — it's owned by and lives alongside the Logging module,
following this doc's `registerAs()`/`ConfigType` conventions exactly
without being one of the 8+10 domains counted above. See
`apps/api/src/logging/README.md`.

**A 10th, `jwt`, follows the same path.**
`apps/api/src/jwt/config/jwt.config.ts` (Phase 1.2D.6) registers it via
`ConfigModule.forFeature()` from within `token.module.ts`, for the
identical reason — owned by and consumed only by the JWT module, not
this folder's frozen `config.module.ts`. Not to be confused with
`config/auth/`, one of the 10 still-placeholder domains above, which
remains reserved for managed IdP settings specifically. See
`apps/api/src/jwt/README.md`.

**An 11th, `hash`, follows the same path.**
`apps/api/src/password/config/hash.config.ts` (Phase 1.2D.7) registers
it via `ConfigModule.forFeature()` from within `password.module.ts`, for
the identical reason — owned by and consumed only by the Password
module, not this folder's frozen `config.module.ts`. Holds only Argon2id
tuning parameters (`memoryCost`, `timeCost`, `parallelism`) — password
business policy (minimum length, reuse rules) is a distinct, still-
unbuilt concern. See `apps/api/src/password/README.md`.

**A 12th, `defaultTenant`, follows the same path.**
`apps/api/src/modules/auth/config/default-tenant.config.ts` (Milestone
1) registers it via `ConfigModule.forFeature()` from within
`auth.module.ts`, for the identical reason — owned by and consumed only
by `AuthRepository`. Holds one value (`id`, from the required
`DEFAULT_TENANT_ID` env var) — a stopgap for real multi-tenant
resolution (no subdomain/header-based mechanism exists), not a real
tenant-switching feature. See `apps/api/src/modules/auth/README.md`.

## 2. Conventions

These apply to every domain, present and future:

- **File naming:** `<domain>.config.ts`, one file per domain (a domain can
  grow multiple files later — e.g. `auth.config.ts` +
  `auth.constants.ts` — but starts with one).
- **Namespace naming:** matches the folder name exactly, lowercase,
  singular-or-plural-as-written (`app`, `database`, `feature-flags` — not
  `featureFlags`). `registerAs('<namespace>', ...)`'s first argument is
  this string.
- **Export style:** `export default registerAs('<namespace>', () => ({
  ... }))` in the `<domain>.config.ts` file; the domain's `index.ts`
  re-exports it (`export { default } from './<domain>.config'`) — every
  domain is reachable both directly and via its own barrel.
- **Folder organization:** one domain = one folder = one namespace. Never
  split one logical domain across two namespaces, never merge two domains
  into one namespace for convenience.
- **Configuration ownership:** the module that consumes a namespace most
  heavily is responsible for keeping that namespace's shape correct and
  documenting changes to it in its own module docs going forward (e.g.
  once `AuthModule` exists, `auth/`'s shape is its concern, not
  `ConfigModule`'s).
- **Import convention:** always `import { X } from '../../config'` (the
  central barrel), never reach into `config/<domain>/<domain>.config` — the
  domain subpath is an implementation detail. Every export a consumer
  needs is re-exported from `config/index.ts`.

**Adding a new configuration domain:**
1. Create `config/<domain>/<domain>.config.ts` — `export default
   registerAs('<domain>', () => ({ ... }))`.
2. Create `config/<domain>/index.ts` — `export { default } from
   './<domain>.config'`.
3. Add it to `config.module.ts`'s `load: [...]` array.
4. Re-export it from `config/index.ts` (`export { default as
   <domain>Config } from './<domain>/<domain>.config'`).
5. Delete that domain's `README.md` placeholder (or fold its content into
   a doc-comment at the top of the new `.config.ts` file) once real values
   land.

## 3. Configuration lifecycle

```
Environment (.env / process.env, injected by the platform in production)
  ↓
Validation                          ← BUILT (Phase 1.2B.2) — Zod schema in
                                        config/env.validation.ts, passed as
                                        ConfigModule.forRoot()'s `validate`
                                        option. Fails fast on missing/
                                        malformed vars instead of failing
                                        wherever the value is first read.
                                        Full detail: validation.md.
  ↓
Configuration Loaders                 `registerAs()` factories, one per
                                       domain (config/*/​*.config.ts) — now
                                       read from the already-validated env
                                       object (validateEnv()), not raw
                                       process.env directly.
  ↓
ConfigModule                          @nestjs/config's ConfigModule,
                                       wrapped by our @Global() ConfigModule
                                       (config/config.module.ts) — loads
                                       every registered namespace once at
                                       bootstrap, caches it, exposes it via
                                       injectable ConfigService.
  ↓
Application Modules                   See §4 for the recommended typed
                                       access pattern (Phase 1.2B.3) —
                                       superseded ConfigService.get() with
                                       a magic-string key as the default.
```

See `docs/architecture/validation.md` for the full schema, error format,
and how to add a newly-validated variable.

## 4. Typed access pattern (Phase 1.2B.3)

**Recommended, project-wide:**
```ts
constructor(
  @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
) {}
```
Every future NestJS provider that needs a config namespace should use
this — `@Inject(<domain>Config.KEY)` + `ConfigType<typeof <domain>Config>`,
both importable from the central barrel (`./config` /
`../../config`, per §2's import convention). Full compile-time shape
checking (rename a field, every consumer breaks at `tsc`, not at runtime),
IDE autocomplete on every field, no magic namespace/key strings to typo.

**Outside a class (no DI container to inject into) — `main.ts`'s case:**
```ts
const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
```
`INestApplication.get()` resolves any provider token directly, including
a `registerAs()` factory's `.KEY` — same type safety, no constructor
needed. This is what `main.ts` does today (see the file itself).

**Secondary/fallback option:** `ConfigService.get('<namespace>.<key>')`
remains exported from `ConfigModule` and works — useful for a provider
that genuinely needs to read across multiple namespaces dynamically (a
key computed at runtime, not known at compile time). Not the default,
since it loses the type-safety and refactor-safety the pattern above
gives for free in every case that doesn't need that dynamism.

**Why this over always using `ConfigService<T>` generics:** typing
`ConfigService<EnvVars>` app-wide would give type safety for flat
top-level keys but doesn't compose cleanly with the namespaced
(`app.port`, `security.rateLimitMax`) shape this architecture uses
throughout — `@Inject(x.KEY)`/`ConfigType<typeof x>` matches the
namespace-per-domain design directly, one namespace at a time, which is
also less boilerplate per consumer (inject only the one namespace a
provider actually needs, not the whole merged config tree).

## 5. Architecture decisions

- **CORS stays under `app`, not `security` — still true now that
  `security/` has real content (Phase 1.2B.3).** `corsAllowedOrigins`
  stays in `app.config.ts`; `security/`'s new content (rate limiting) is
  unrelated. Moving already-shipped, working config for naming purity
  alone remains unjustified churn — the bar was "does `security/` have
  real content that CORS logically belongs with," and rate limiting isn't
  that content. Still flagged for reconsideration only if `security/`
  grows a genuine access-control concern (e.g. an allow-list check) that
  CORS would naturally sit beside.
- **Security/Logging/Swagger/Health graduated with new, minimal,
  safe-defaulted infra env vars — not by relocating existing fields or
  staying speculative.** Confirmed with the user (Phase 1.2B.3): these
  are platform-internal toggles (rate-limit thresholds, log format, doc
  path, health path), not third-party product/vendor integrations, so
  they don't conflict with "no speculative configuration for future
  products." `cache`/`queue` didn't need new vars — they reuse the
  already-required `REDIS_URL`.
- **`cache/` and `queue/` are separate domains despite sharing one Redis
  instance.** `architecture.md`: "Redis (cache/sessions/queue/rate-limit)"
  — one instance, multiple concerns. Config-wise they're genuinely
  different: cache cares about TTLs/key-prefixes/eviction, queue cares
  about job retry/backoff/concurrency. Splitting them means a future
  `CacheModule` and `QueueModule` each depend only on their own namespace,
  not a shared "redis" grab-bag namespace neither owns cleanly.
- **`auth/` and `security/` are separate domains.** `auth/` is identity
  (who is this request from, how long is their session valid); `security/`
  is policy that applies regardless of identity (rate limits, hashing
  cost, CSP). A guard checking "is this JWT valid" reads `auth/`; a guard
  checking "has this IP made too many requests" reads `security/` — kept
  distinct so neither module ends up importing a namespace half of whose
  fields it doesn't use.
- **`email/` (transport) vs `notifications/` (dispatch policy) vs
  `apps/api/src/modules/notifications/` (business logic) are three
  different things**, each already flagged as distinct in their own
  READMEs — called out here together since "notification" is the one word
  that could plausibly mean any of the three.
- **`loggerOptions` (Phase 1.2C.2) lives in `apps/api/src/logging/`, not
  in this folder.** This folder's `config.module.ts` `forRoot()` call is
  frozen (Phase 1.2B RC); a config concern owned by and consumed only by
  one module — not a general-purpose domain other subsystems would
  reuse — graduates alongside that module instead, registered via
  `ConfigModule.forFeature()`. It still follows every convention in §2
  (`registerAs()`, `index.ts` barrel, `ConfigType` access) — only the
  folder and registration call differ.

## Deferred (explicitly out of scope for this doc)
- Environment-shape validation — built in Phase 1.2B.2, see
  `docs/architecture/validation.md` (this doc's §3 links it)
- Any real value/logic in the 10 remaining placeholder domains (all
  third-party product/vendor integrations — see §1)
- `DatabaseModule`/`PrismaService`, auth guards, real Swagger UI/health
  controllers (config only exists for these two so far), and everything
  else `backend.md`'s "Deferred to Phase 1.2B" section already lists
