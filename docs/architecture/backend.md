# Backend Architecture (Phase 1.2A) — NestJS Foundation

Companion to `architecture.md`'s one-line backend summary ("modular monolith
... Modules: auth, projects, billing, crm, notifications, content +
cross-cutting common layer") — this doc is the source of truth for *what got
built* in `apps/api/src`. Same relationship `database-schema.md` has to
`database.md`.

**Status:** application shell only — bootstrap, module structure, global
config. No database connection, no business logic, no controllers, no auth.
See "Deferred to Phase 1.2B" at the end.

## 1. Folder structure

```
apps/api/src/
  main.ts              Bootstrap: prefix, versioning, shutdown hooks, listen.
  app.module.ts         Root module — imports ConfigModule; future business
                         modules attach here.
  config/                Per-domain configuration architecture — full detail
                          in docs/architecture/configuration.md. 8 domains
                          are real (app, database, security, logging,
                          swagger, health, cache, queue — Phase 1.2B.1/
                          1.2B.3); 10 remain placeholders (auth, storage,
                          email, notifications, payments, ai, search,
                          analytics, feature-flags, monitoring) — all
                          third-party product/vendor integrations that
                          don't exist yet.
  common/                Cross-cutting concerns (placeholders, Phase 1.2B+):
    filters/                Exception filters (RFC 9457 error shape).
    interceptors/           Response shaping, trace_id propagation.
    guards/                 Auth/RBAC guards.
    pipes/                  Request validation.
    middleware/             Request-id stamping, etc.
  database/              PLACEHOLDER — future PrismaModule/PrismaService home.
                          Distinct from apps/api/prisma/ (schema/migrations,
                          untouched by this phase).
  health/                 PLACEHOLDER — liveness/readiness endpoints.
  modules/                PLACEHOLDER — one folder per business module,
                          scaffolded in Phase 0, unchanged this phase:
    auth/ billing/ content/ crm/ notifications/ projects/
  jobs/                   PLACEHOLDER — queue-driven background workers
                          (Phase 0 scaffold, unchanged).
  shared/                 PLACEHOLDER — code shared across apps/api's own
                          modules only. Contrast packages/shared
                          (cross-workspace, frontend+backend).
  types/                  PLACEHOLDER — types shared across apps/api's own
                          modules only. Contrast packages/shared /
                          packages/api-contract (public API surface).
  utils/                  PLACEHOLDER — framework-agnostic pure helpers
                          (no NestJS DI/decorators — contrast common/).
```

"Placeholder" means exactly what it means everywhere else in this repo
(Phase 0 set the convention for `common/`, `jobs/`, `modules/*/`): a folder
with one README describing its purpose, zero code, "No implementation."
This phase extends that convention to every new folder the brief asked for
without asking for real logic in it.

## 2. Startup flow (`main.ts`, in order)

1. `NestFactory.create(AppModule)` — resolves the DI graph; `ConfigModule`
   loads and parses `.env` (via `@nestjs/config`'s built-in dotenv
   integration) before anything else runs, since it's `@Global()` and every
   other provider may depend on `ConfigService`.
2. Read `port`/`nodeEnv` via `app.get<ConfigType<typeof appConfig>>
   (appConfig.KEY)` — the typed-injection access pattern (Phase 1.2B.3,
   see §4/`configuration.md` §4) — not `process.env` directly, and not
   `ConfigService.get('app.port')` (superseded; kept only as a documented
   secondary option for genuinely dynamic lookups).
3. `app.setGlobalPrefix('api')` + `app.enableVersioning({ type:
   VersioningType.URI, defaultVersion: '1' })` — every future controller
   resolves under `/api/v1/...` without each one needing an explicit
   `@Version('1')`.
4. Production-only: `trust proxy` set on the underlying Express instance —
   see §5 "HTTPS-ready bootstrap" for why this, not `httpsOptions`, is the
   correct interpretation for this deploy topology.
5. `app.enableShutdownHooks()` — registers `SIGTERM`/`SIGINT` handlers so a
   rolling deploy on managed containers drains in-flight requests via
   `OnModuleDestroy`/`OnApplicationShutdown` instead of dropping them.
6. `app.listen(port)`, then one `Logger('Bootstrap').log(...)` line
   confirming the port/prefix/env — startup confirmation, not a logging
   system (CONTRIBUTING.md §15's structured-JSON/centralized logging is
   Phase 1.2B).

Everything CORS/ValidationPipe/exception-filter/interceptor-shaped is a
**comment**, not a call, at the exact point in this sequence it will attach
— see the comment block in `main.ts` itself.

## 3. Dependency graph

```
AppModule
  └─ ConfigModule (@Global — every future module gets ConfigService for free)
```

Phase 1.2B+ shape (not built yet, documented so the intended graph is
visible before the code exists):

```
AppModule
  ├─ ConfigModule (@Global)
  ├─ DatabaseModule (apps/api/src/database/ — PrismaModule, @Global-ish:
  │    exported so repositories in every business module can inject
  │    PrismaService without each importing DatabaseModule separately)
  ├─ AuthModule        (depends on DatabaseModule — users table)
  ├─ ProjectsModule     (depends on DatabaseModule, AuthModule for guards)
  ├─ BillingModule      (depends on DatabaseModule, AuthModule)
  ├─ CrmModule          (depends on DatabaseModule, AuthModule)
  ├─ NotificationsModule(depends on DatabaseModule, AuthModule)
  └─ ContentModule      (depends on DatabaseModule, AuthModule)
```

One-way dependency per CONTRIBUTING.md §3 (UI → services → repositories →
DB): business modules depend on `DatabaseModule`/`AuthModule`, never the
reverse, and business modules don't depend on each other directly — shared
needs go through `shared/`/`common/` or an explicit cross-module provider
export, avoiding the circular-dependency trap DI-heavy Nest apps are prone
to (CONTRIBUTING.md §7 / this phase's brief §7).

## 4. Configuration

See `docs/architecture/configuration.md` — the dedicated companion doc
(Phase 1.2B.1) for the full per-domain folder architecture, conventions,
and lifecycle. Short version: `@nestjs/config`, loaded globally once in
`ConfigModule` (`apps/api/src/config/`), organized into 8 real per-domain
**namespaces** via `registerAs()` (Phase 1.2B.3) — accessed via
`@Inject(xConfig.KEY)`/`ConfigType<typeof xConfig>` (or `app.get(xConfig.KEY)`
outside DI), not `ConfigService.get('app.port')` string keys — see
`configuration.md` §4 for the full rationale. `database`'s namespace is
data only (no Prisma import, no connection, `apps/api/prisma/` untouched).
Environment validation is built — see `docs/architecture/validation.md`
(Phase 1.2B.2, extended 1.2B.3). For usage examples, troubleshooting, and
how to extend any of this, see `docs/architecture/configuration-guide.md`
(Phase 1.2B.4).

## 5. Architecture decisions this phase

- **"HTTPS-ready bootstrap" = trust-proxy-ready, not literal TLS
  termination in-process.** `architecture.md`'s deploy topology terminates
  TLS at the CDN/managed-container load balancer, never in the Node
  process itself. Passing `httpsOptions` into `NestFactory.create` would be
  dead code for every real deploy target this architecture describes —
  instead, production sets `trust proxy` so the app correctly reads
  `X-Forwarded-Proto`/`X-Forwarded-For` from that upstream TLS terminator
  (needed for correct redirect/IP-logging behavior behind a proxy).
- **Placeholder resolution for CORS/Validation/Filters/Interceptors.** The
  brief asks to "configure... placeholder... register placeholders" for
  these while separately forbidding implementing their logic. Resolved as:
  a clearly-labeled comment block in `main.ts` at the exact point each
  would attach, not an actual `app.use*()` call — consistent with how
  Phase 0 already left `common/`, `jobs/`, and `modules/*/` as
  documentation-only placeholders with zero code.
- **Config organization: two namespaces at the time this phase (1.2A) was
  written, more added on demand — since grown to 8 real domains (Phase
  1.2B.3), the remaining 10 still following this same principle.**
  Considered scaffolding all eventual namespaces (`auth`, `payments`,
  `storage`, `email`) immediately for "completeness." Rejected — nothing
  consumed them at the time, and empty speculative config namespaces are
  exactly the kind of premature structure CONTRIBUTING.md's coding
  standards (§13, and this repo's own working conventions) argue against.
  `app` and `database` were added first because `main.ts` and the (future)
  `DatabaseModule` needed them immediately; `security`/`logging`/
  `swagger`/`health`/`cache`/`queue` graduated later, on the same
  need-it-now basis, not upfront — see `configuration.md` §1/§5 for the
  current, authoritative domain count.
- **No path alias (`@/*`) added to `apps/api`, despite `apps/web` having
  one.** `tsconfig-paths` sat as an unused devDependency in
  `apps/api/package.json` for four review passes (flagged, never wired) —
  removed in the Phase 1.2B RC stabilization pass rather than deferred a
  fifth time, since nothing ever consumed it. Wiring a real path alias
  still touches `tsconfig.json`, `ts-node`/`nest start` config, and Jest's
  `moduleNameMapper` simultaneously — real complexity, and still zero
  current payoff with an empty module structure. Revisit (adding the
  dependency back along with the actual wiring, together) once
  `modules/*/` has files importing from `common/`/`shared/` a few
  directories deep.

## Deferred to Phase 1.2B (explicitly out of scope for this doc)
- `DatabaseModule`/`PrismaService`, real repository pattern
- Auth: guards, JWT strategy, session handling
- Real CORS/ValidationPipe/exception-filter/interceptor logic (comments →
  code)
- Swagger UI, health-check controller, a structured logging framework, a
  Redis client, queue workers — their *configuration* is real as of Phase
  1.2B.3 (`swagger`/`health`/`logging`/`cache`/`queue` namespaces), but
  nothing consumes it yet
- Any controller, service, DTO, or business logic in `modules/*/`
