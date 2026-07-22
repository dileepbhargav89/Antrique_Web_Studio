# Cache module — CacheService (Milestone 12 — Performance Engineering)

Application-level caching infrastructure — a new top-level infra module
mirroring `jwt/` (`TokenModule`) and `password/` (`PasswordModule`)'s exact
precedent: `@Global()` so any future consumer can inject `CacheService`
without this module being imported everywhere.

"Implement a reusable cache abstraction. Support: in-memory cache, TTL,
invalidation hooks, cache keys, read-through strategy... No Redis. No
distributed cache." — this milestone's own explicit brief. `CacheService`
is a single process-local `Map`, lazily expired on read (checked only when
a key is actually read, never swept by a background timer — no
`onModuleDestroy` cleanup complexity, no risk of a timer firing after
shutdown begins). Deliberately NOT a distributed cache: a multi-instance
deployment would each hold its own independent copy — exactly why this must
never front anything a stale READ could make INCORRECT to act on
(mutable/transactional business state), only read-mostly reference/config
data where a few seconds of staleness is a non-issue.

## What's real here

- `cache.service.ts` — `CacheService`:
  - `get<T>(key)` / `set<T>(key, value, ttlMs)` — the primitives. `get()`
    returns `undefined` for both "never set" and "expired" (a caller never
    needs to distinguish the two); an expired entry is deleted on the read
    that discovers it.
  - `delete(key)` / `deleteByPrefix(prefix)` / `clear()` — "invalidation
    hooks." Cache keys in this codebase follow a
    `"<namespace>:<tenantId>:<rest>"` convention (e.g.
    `role-keys:{tenantId}:{email}`), so `deleteByPrefix()` can invalidate
    every entry for one tenant/namespace in one call without the caller
    needing to know every exact key that was ever set.
  - `getOrLoad<T>(key, ttlMs, load)` — "read-through strategy," the one
    method most real callers actually use: return the cached value if
    still fresh, otherwise call `load()`, cache its result, return it.
    `load()` only ever runs on a genuine miss. A concurrent second caller
    racing the same key before the first `load()` resolves independently
    calls `load()` again — an accepted, harmless double-load under this
    process-local, non-distributed design; there is no cross-request lock
    to coordinate them, and adding one would be exactly the kind of
    complexity "application-level optimization only" argues against.
  - `size` — instrumentation/testing only, no production call site (the
    same "build the capability, no forced current consumer" pattern
    `PerformanceLogger`/`RequestContextService` already established).
- `cache.module.ts` — `CacheModule`, `@Global()`, exports `CacheService`
  only.

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

No Redis, no distributed cache, no cross-process coordination, no
background expiry sweep, no cache warming, no write-through/write-behind
strategy, no per-key size limit or LRU eviction (this codebase's own scale
has never needed one — revisit if it does).
