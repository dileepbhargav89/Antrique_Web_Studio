# Database module — PrismaService & BaseRepository (Phase 1.2D.2–1.2D.3)

Distinct from `apps/api/prisma/` (schema, migrations, seed data — the
database infrastructure itself, audited and approved in Phase 1). This
directory is the NestJS-side wiring that connects to it.

## What's real here

- `prisma.service.ts` — `PrismaService extends PrismaClient`, the single
  database access layer every future repository injects. Constructs its
  driver adapter (`@prisma/adapter-pg`'s `PrismaPg`, Prisma 7's required
  pattern — see `apps/api/prisma.config.ts`) from the already-validated
  `database` config namespace, never `process.env` directly. Connects
  and validates eagerly in `onModuleInit()` (fail-fast, matching
  `env.validation.ts`'s own philosophy — a database that can't connect
  stops the app before any request is served) and disconnects in
  `onModuleDestroy()`, which fires automatically on SIGTERM/SIGINT via
  `main.ts`'s existing `app.enableShutdownHooks()` (Phase 1.2A).
  **`onModuleInit()` runs a real `SELECT 1`, not just `$connect()`** —
  found during this phase's review: `@prisma/adapter-pg` wraps a lazy
  `pg.Pool` that opens no real socket until first use, so `$connect()`
  alone resolves successfully even against a completely invalid
  connection string (confirmed live: booting with a deliberately bad
  `DATABASE_URL` still logged "Database connection established" and
  served requests normally). The real query is what actually forces and
  validates the connection. `isHealthy()` — a plain
  `SELECT 1` liveness check, no model-specific query — has no current
  caller yet (the `health/` controller is still a config-only
  placeholder, Phase 1.2B.3), the same "build the capability before its
  first real consumer" pattern already used for `RequestContextService`/
  `PerformanceLogger`.
- `database.module.ts` — `DatabaseModule`, `@Global()` (matching
  `ConfigModule`/`LoggingModule`'s precedent), exports `PrismaService`
  only. Singleton by Nest's default provider scope — one `PrismaClient`
  for the whole application, regardless of how many modules eventually
  inject it.
- `base.repository.ts` (Phase 1.2D.3) — `BaseRepository<TDelegate>`, the
  generic CRUD abstraction (`findOne`/`findMany`/`create`/`update`/
  `delete`) every future repository extends. Depends only on the
  delegate object (e.g. `prisma.setting`) passed to its constructor,
  never on `PrismaService`/Nest's DI container directly — a concrete
  subclass is what's `@Injectable()` and injects `PrismaService`, then
  hands this class the one model delegate it owns. `Parameters<>`/
  `ReturnType<>` recover each real model's actual argument/return types
  from whatever concrete delegate a subclass provides — see
  `docs/architecture/domain-module-guide.md`'s "Repository layer" for
  the full convention and
  `apps/api/src/modules/example-domain/repositories/example.repository.ts`
  for a real, type-checked example against `PrismaService['setting']`.

## Why `PrismaService` has no `.spec.ts`, but `BaseRepository` does

`PrismaService`'s `$connect()`/`$queryRaw`/`$disconnect()` only mean
something against a real Postgres connection — unit-testing them would
mean either standing up a live database inside the Jest suite (an
external dependency no other test in this codebase has) or mocking
Prisma's generated internals so heavily the test would only prove the
mock does what the mock does. Verified instead the way Phase 1's
database work always was: live boot against a real Postgres, confirming
actual connect/disconnect/health-check behavior. `BaseRepository` is
different — it depends only on a plain delegate object, so
`base.repository.spec.ts` tests it with a plain mock, no real
Prisma/Postgres involved, the same way every other unit test in this
codebase works.

## What this phase explicitly does NOT do

No domain-specific repositories (`AuthRepository`, `UserRepository`,
...), no transactions, no query builders, no caching, no model-specific
helpers, no business logic. Real repositories for real domains begin in
Phase 1.2D.4+, following `docs/architecture/domain-module-guide.md`'s
"Repository layer" — extend `BaseRepository`, inject `PrismaService`
only inside the repository, never in a service directly.
