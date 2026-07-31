import { CacheStore } from './cache-store.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// The original Milestone 12 implementation ("Implement a reusable cache
// abstraction... in-memory cache, TTL... No Redis" — that milestone's own
// brief) — a single process-local `Map`, lazily expired on read (checked
// only when a key is actually read, never swept by a background timer).
// No longer what `CacheModule` wires up in production (see
// `redis-cache.store.ts`), but kept as a real `CacheStore` implementation
// specifically because it's what every business-logic test that needs a
// working cache double (dashboard/authorization/tenant-resolver specs)
// constructs directly — fast, synchronous-under-the-hood, no live Redis
// required for tests that aren't about caching itself.
export class InMemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | undefined> {
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

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async deleteByPrefix(prefix: string): Promise<void> {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async size(): Promise<number> {
    return this.store.size;
  }
}
