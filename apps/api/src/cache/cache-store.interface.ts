// The storage backend CacheService delegates to — `InMemoryCacheStore`
// (this codebase's original Milestone 12 implementation, still used by
// every business-logic test that needs a real, fast, dependency-free
// cache double — dashboard/authorization/tenant-resolver specs, etc.) or
// `RedisCacheStore` (Phase 10, Module 8 revisit — what `CacheModule`
// actually wires up at runtime). Every method is async because Redis
// calls inherently are; `InMemoryCacheStore`'s implementations just
// resolve synchronously under the hood.
export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}
