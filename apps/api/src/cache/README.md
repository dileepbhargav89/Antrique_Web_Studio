# Cache module — CacheService (Milestone 12 — Performance Engineering; Redis-backed since Phase 10, Module 8 revisit)

Application-level caching infrastructure — a new top-level infra module
mirroring `jwt/` (`TokenModule`) and `password/` (`PasswordModule`)'s exact
precedent: `@Global()` so any future consumer can inject `CacheService`
without this module being imported everywhere.

Originally built as "in-memory cache, TTL, invalidation hooks, cache keys,
read-through strategy... No Redis. No distributed cache" (Milestone 12's
own explicit brief) — correct for a single instance, but a multi-instance
deployment (Phase 10's actual production target) would have each instance
holding its own independent, silently-diverging copy. Revisited this pass:
a real Redis instance is now provisioned (previously validated as
`REDIS_URL` but never consumed by any client — see `cache.config.ts`'s own
prior comment), so `CacheService` is backed by it in production, and every
instance now shares one cache.

The storage backend is injected as a `CacheStore` (`cache-store.interface.ts`)
so this swap didn't have to touch every test that constructs a working
`CacheService` for unrelated business-logic tests:

- `RedisCacheStore` — what `CacheModule` wires up for real. Every key is
  namespaced under a `cache:` prefix; TTL is Redis's own native expiry
  (`SET ... PX ttlMs`), not hand-rolled bookkeeping; a transient Redis
  error on any operation is caught, logged, and treated as a miss/no-op
  rather than propagated (a cache is best-effort — the "hottest read
  paths" this sits in front of should degrade to their own uncached path
  under a brief Redis blip, not fail the request outright).
- `InMemoryCacheStore` — the original Milestone 12 `Map`-based
  implementation, kept specifically because it's what every business-logic
  test that needs a real, fast, dependency-free cache double
  (dashboard/authorization/tenant-resolver specs, etc.) constructs
  directly, with no live Redis required.

`RedisService` (`redis.service.ts`) is the actual `ioredis` client —
extends `Redis` directly, the same "no wrapper, inject the client itself"
precedent `PrismaService extends PrismaClient` already established.
Fail-fast on a bad `REDIS_URL` at boot (`onModuleInit()`), matching
`PrismaService`'s own reasoning; exposes `isHealthy()` for
`HealthService`'s `checks.redis` probe. `family: 4` is forced on the
connection — confirmed live during this pass: a bare `localhost` in
`REDIS_URL` resolves to the IPv6 loopback first on this codebase's own
Windows dev environment, but Memurai (the local Redis-compatible service
used there) only binds IPv4, so an unqualified connection attempt failed
with `ECONNREFUSED` even with an otherwise-correct `REDIS_URL`.

## What's real here

- `cache.service.ts` — `CacheService`, now a thin delegator to whichever
  `CacheStore` is injected:
  - `get<T>(key)` / `set<T>(key, value, ttlMs)` — the primitives. `get()`
    returns `undefined` for "never set," "expired," and (for
    `RedisCacheStore`) "Redis unreachable right now" alike — a caller
    never needs to distinguish any of them, only whether a fresh value
    must be loaded.
  - `delete(key)` / `deleteByPrefix(prefix)` / `clear()` — "invalidation
    hooks." Cache keys in this codebase follow a
    `"<namespace>:<tenantId>:<rest>"` convention (e.g.
    `role-keys:{tenantId}:{email}`), so `deleteByPrefix()` can invalidate
    every entry for one tenant/namespace in one call without the caller
    needing to know every exact key that was ever set. `RedisCacheStore`
    implements this via `SCAN` (never `KEYS`, which blocks the whole
    instance on a large keyspace), not a native Redis primitive.
  - `getOrLoad<T>(key, ttlMs, load)` — "read-through strategy," the one
    method most real callers actually use: return the cached value if
    still fresh, otherwise call `load()`, cache its result, return it.
    `load()` only ever runs on a genuine miss. A concurrent second caller
    racing the same key before the first `load()` resolves independently
    calls `load()` again — an accepted, harmless double-load; there is no
    cross-request lock to coordinate them, and adding one would be
    exactly the kind of complexity "application-level optimization only"
    argues against.
  - `size()` — instrumentation/testing only, no production call site (the
    same "build the capability, no forced current consumer" pattern
    `PerformanceLogger`/`RequestContextService` already established). Now
    async (a `RedisCacheStore` `SCAN` count, not a synchronous `Map.size`).
- `cache-store.interface.ts` / `in-memory-cache.store.ts` /
  `redis-cache.store.ts` — the `CacheStore` abstraction and its two
  implementations, described above.
- `redis.service.ts` — `RedisService`, the real `ioredis` client.
- `cache.module.ts` — `CacheModule`, `@Global()`, exports `CacheService`
  and `RedisService`; binds `CACHE_STORE` to `RedisCacheStore`.

## First real consumer: `AuthorizationService`

Role/permission resolution (`RoleRepository.findRolesForUser()`) ran on
**every** `PermissionsGuard`/`RolesGuard`-protected request — by Milestone
12, most routes in this API — even though a user's role/permission grants
change extremely rarely. `AuthorizationService.loadRoles()` now checks the
CALLER's per-request `AuthorizationCache` first (Milestone 3's own "cache
within a request only" layer, completely unchanged), and only on a miss
there falls through to `this.cache.getOrLoad('role-keys:{tenantId}:{email}',
60_000, () => this.roleRepository.findRolesForUser(...))` — a second,
cross-request layer underneath the first, not a replacement for it.

60 seconds: long enough to eliminate the database round trip for the
overwhelming majority of requests in any real usage burst, short enough
that a role/permission grant change (today: seed-data-only, no live
`RoleController`/`PermissionController` exists to change one at runtime)
is never stale for more than a minute even with no explicit invalidation
call anywhere. If a future milestone adds a live grant-editing endpoint,
that's the point to add a real `cache.deleteByPrefix('role-keys:' +
tenantId)` call alongside it — this TTL is a deliberate, honest stopgap
for "nothing mutates this at runtime yet," not a substitute for real
invalidation once something does.

Verified: two SEPARATE per-request `AuthorizationCache` objects (i.e. two
different HTTP requests) for the SAME user now share one underlying
database query, not two (`authorization.service.spec.ts`); two different
users' resolutions never leak into each other's cache entry (different
cache keys).

## Why other candidates were evaluated but not cached this milestone

`TaxRate`/`PaymentMethod`/`LeadSource`/`NotificationTemplate` are all
read-mostly reference data too. Each is already a cheap, single-row,
indexed-PK lookup (not a multi-join aggregate like role resolution), read
far less often than "every guarded request" — and `TaxRate` specifically
already has a LIVE write endpoint (`TaxRateController`) this milestone did
not build real cache invalidation for. Caching it with only a TTL (no
invalidation on write) would risk a genuinely stale tax rate surviving a
real admin edit for up to the TTL window — a correctness risk the role/
permission case doesn't share (nothing currently writes roles at runtime
at all). Deferred rather than rushed; see
`docs/architecture/performance.md` §1.2 for the full reasoning.

## What this module explicitly does NOT do

No cross-process coordination beyond what Redis itself provides, no cache
warming, no write-through/write-behind strategy, no per-key size limit or
LRU eviction (this codebase's own scale has never needed one — revisit if
it does), no distinguishing "expired" from "Redis briefly unreachable" (by
design — see `get()`'s own comment).
