import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// Milestone 12 (Performance Engineering) — "Implement a reusable cache
// abstraction. Support: in-memory cache, TTL, invalidation hooks, cache
// keys, read-through strategy... No Redis. No distributed cache." A
// single process-local `Map`, lazily expired (checked on read, not swept
// by a background timer) — no `setInterval` to clean up on
// `onModuleDestroy`, no risk of a timer callback firing after shutdown
// has already begun. This is deliberately NOT a distributed cache: a
// multi-instance deployment would each hold its own independent copy,
// which is exactly why this must never be used for anything a stale
// READ could make INCORRECT to act on (business/transactional state) —
// only for read-mostly reference/config data where a few seconds of
// staleness is a non-issue. See this class's own README for the "what
// to cache / what never to cache" rule this codebase follows.
//
// A plain `@Injectable()`, not `@Global()` itself — `CacheModule` is
// what's global (see cache.module.ts), the same split every other infra
// service in this codebase uses (LoggerService vs. LoggingModule,
// TokenService vs. TokenModule).
@Injectable()
export class CacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  // Returns `undefined` for both "never set" and "expired" — a caller
  // never needs to distinguish the two, only whether a fresh value must
  // be loaded. An expired entry is deleted here, on the read that
  // discovers it — the only place expiry is ever checked, so a key that
  // is never read again is simply never swept (acceptable for this
  // codebase's own scale; see the README for why a background sweep
  // isn't worth the shutdown-hook complexity it would add).
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  // "Invalidation hooks" — a single key, or every key sharing a prefix
  // (the convention this codebase's own cache keys follow — see the
  // README — is `"<namespace>:<tenantId>:<rest>"`, so
  // `deleteByPrefix('role-keys:' + tenantId)` invalidates every cached
  // role/permission resolution for one tenant in one call, without the
  // caller needing to know every exact key that was ever set).
  delete(key: string): void {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  // "Read-through strategy" — the one method most real callers actually
  // use: return the cached value if still fresh, otherwise call `load()`,
  // cache its result, and return it. `load()` is only ever invoked on a
  // cache miss, never speculatively — a concurrent second caller racing
  // the same key before the first `load()` resolves will independently
  // call `load()` again (an accepted, harmless double-load under this
  // process-local, non-distributed design — there is no cross-request
  // lock to coordinate them, and adding one would be exactly the kind of
  // complexity "application-level optimization only" argues against for
  // this milestone's own scope).
  async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    const value = await load();
    this.set(key, value, ttlMs);
    return value;
  }

  // Instrumentation/testing only — how many entries are currently held
  // (including not-yet-lazily-expired ones). No production call site;
  // exists for the same "build the capability, no forced current
  // consumer" reasoning PerformanceLogger/RequestContextService already
  // established in this codebase, plus this milestone's own cache
  // specs.
  get size(): number {
    return this.store.size;
  }
}
