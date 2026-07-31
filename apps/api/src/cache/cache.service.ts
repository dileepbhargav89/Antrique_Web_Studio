import { Inject, Injectable } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';
import { CACHE_STORE } from './cache.tokens';
import { CacheStore } from './cache-store.interface';

// Phase 10, Module 8 (Caching) — the NAMESPACE segment of a cache key
// (`"<namespace>:<rest>"`, this class's own already-documented
// convention) — a fixed, small label for `cache_operations_total`, never
// the full key (which carries a tenantId/email/date range and would be
// an unbounded-cardinality label, the exact mistake HTTP route labeling
// already guards against — see `MetricsService`'s own comment). A key
// with no `:` at all (shouldn't happen given the convention, but
// `String.prototype.split` never throws) labels as the whole key.
function cacheNamespace(key: string): string {
  return key.split(':')[0] ?? key;
}

// Milestone 12 (Performance Engineering) — application-level caching.
// Originally a single process-local `Map` ("No Redis. No distributed
// cache" — that milestone's own explicit brief); revisited this pass
// (Phase 10, Module 8) now that a real, shared Redis instance is actually
// provisioned — see `redis-cache.store.ts`. The storage backend itself is
// injected as a `CacheStore` (see that interface) so `CacheModule` can
// wire a `RedisCacheStore` in production while every business-logic test
// that just needs a working cache double keeps constructing an
// `InMemoryCacheStore` directly — no live Redis required for tests that
// aren't about caching itself. See `cache.service.spec.ts` for
// CacheService's own (store-agnostic) tests.
//
// Still deliberately NOT used for anything a stale READ could make
// INCORRECT to act on (mutable/transactional business state) — only
// read-mostly reference/config data where a few seconds of staleness is
// a non-issue. See this class's own README for the "what to cache / what
// never to cache" rule.
@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_STORE)
    private readonly store: CacheStore,
    private readonly metrics: MetricsService,
  ) {}

  // Returns `undefined` for both "never set" and "expired" — a caller
  // never needs to distinguish the two, only whether a fresh value must
  // be loaded.
  get<T>(key: string): Promise<T | undefined> {
    return this.store.get<T>(key);
  }

  set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    return this.store.set(key, value, ttlMs);
  }

  delete(key: string): Promise<void> {
    return this.store.delete(key);
  }

  // "Invalidation hooks" — a single key, or every key sharing a prefix
  // (the convention this codebase's own cache keys follow — see the
  // README — is `"<namespace>:<tenantId>:<rest>"`, so
  // `deleteByPrefix('role-keys:' + tenantId)` invalidates every cached
  // role/permission resolution for one tenant in one call, without the
  // caller needing to know every exact key that was ever set).
  deleteByPrefix(prefix: string): Promise<void> {
    return this.store.deleteByPrefix(prefix);
  }

  clear(): Promise<void> {
    return this.store.clear();
  }

  // Instrumentation/testing only — how many entries are currently held.
  // No production call site (the same "build the capability, no forced
  // current consumer" pattern PerformanceLogger/RequestContextService
  // already established).
  size(): Promise<number> {
    return this.store.size();
  }

  // "Read-through strategy" — the one method most real callers actually
  // use: return the cached value if still fresh, otherwise call `load()`,
  // cache its result, and return it. `load()` is only ever invoked on a
  // cache miss, never speculatively — a concurrent second caller racing
  // the same key before the first `load()` resolves will independently
  // call `load()` again (an accepted, harmless double-load — there is no
  // cross-request lock to coordinate them, and adding one would be
  // exactly the kind of complexity "application-level optimization only"
  // argues against for this milestone's own scope).
  async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const cached = await this.store.get<T>(key);
    if (cached !== undefined) {
      this.metrics.recordCacheOperation(cacheNamespace(key), 'hit');
      return cached;
    }
    this.metrics.recordCacheOperation(cacheNamespace(key), 'miss');
    const value = await load();
    await this.store.set(key, value, ttlMs);
    return value;
  }
}
