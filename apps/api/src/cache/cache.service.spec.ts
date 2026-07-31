import { MetricsService } from '../metrics/metrics.service';
import { CacheService } from './cache.service';
import { InMemoryCacheStore } from './in-memory-cache.store';

// CacheService itself is store-agnostic (see cache-store.interface.ts) —
// these tests exercise it against InMemoryCacheStore, the same store
// every business-logic test elsewhere in this codebase constructs
// directly for a fast, dependency-free cache double. RedisCacheStore's
// own Redis-specific behavior (key prefixing, SCAN-based prefix delete,
// resilience to a Redis error) is covered separately in
// redis-cache.store.spec.ts.
describe('CacheService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function createCache() {
    return new CacheService(new InMemoryCacheStore(), new MetricsService());
  }

  describe('get() / set()', () => {
    it('returns undefined for a key that was never set', async () => {
      const cache = createCache();

      await expect(cache.get('missing')).resolves.toBeUndefined();
    });

    it('returns the set value while still within its TTL', async () => {
      const cache = createCache();

      await cache.set('key-1', { value: 42 }, 1000);

      await expect(cache.get('key-1')).resolves.toEqual({ value: 42 });
    });

    it('returns undefined once its TTL has elapsed', async () => {
      jest.useFakeTimers().setSystemTime(0);
      const cache = createCache();
      await cache.set('key-1', 'fresh', 1000);

      jest.setSystemTime(1001);

      await expect(cache.get('key-1')).resolves.toBeUndefined();
    });

    it('does not expire an entry read just before its TTL elapses (boundary is exceeded, not equal)', async () => {
      jest.useFakeTimers().setSystemTime(0);
      const cache = createCache();
      await cache.set('key-1', 'fresh', 1000);

      jest.setSystemTime(999);

      await expect(cache.get('key-1')).resolves.toBe('fresh');
    });
  });

  describe('delete() / deleteByPrefix() / clear()', () => {
    it('delete() removes exactly the given key', async () => {
      const cache = createCache();
      await cache.set('a', 1, 1000);
      await cache.set('b', 2, 1000);

      await cache.delete('a');

      await expect(cache.get('a')).resolves.toBeUndefined();
      await expect(cache.get('b')).resolves.toBe(2);
    });

    it('deleteByPrefix() removes every key sharing the given prefix, leaving others untouched', async () => {
      const cache = createCache();
      await cache.set('role-keys:tenant-1:a@x.com', ['admin'], 1000);
      await cache.set('role-keys:tenant-1:b@x.com', ['manager'], 1000);
      await cache.set('role-keys:tenant-2:a@x.com', ['customer'], 1000);

      await cache.deleteByPrefix('role-keys:tenant-1:');

      await expect(cache.get('role-keys:tenant-1:a@x.com')).resolves.toBeUndefined();
      await expect(cache.get('role-keys:tenant-1:b@x.com')).resolves.toBeUndefined();
      await expect(cache.get('role-keys:tenant-2:a@x.com')).resolves.toEqual(['customer']);
    });

    it('clear() empties every entry regardless of key', async () => {
      const cache = createCache();
      await cache.set('a', 1, 1000);
      await cache.set('b', 2, 1000);

      await cache.clear();

      await expect(cache.size()).resolves.toBe(0);
    });
  });

  describe('getOrLoad()', () => {
    it('calls load() on a miss and caches the result', async () => {
      const cache = createCache();
      const load = jest.fn(async () => 'loaded-value');

      const result = await cache.getOrLoad('key-1', 1000, load);

      expect(result).toBe('loaded-value');
      expect(load).toHaveBeenCalledTimes(1);
      await expect(cache.get('key-1')).resolves.toBe('loaded-value');
    });

    it('does not call load() again on a subsequent hit within the TTL', async () => {
      const cache = createCache();
      const load = jest.fn(async () => 'loaded-value');

      await cache.getOrLoad('key-1', 1000, load);
      await cache.getOrLoad('key-1', 1000, load);

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('calls load() again once the cached value has expired', async () => {
      jest.useFakeTimers().setSystemTime(0);
      const cache = createCache();
      const load = jest.fn(async () => 'loaded-value');

      await cache.getOrLoad('key-1', 1000, load);
      jest.setSystemTime(1001);
      await cache.getOrLoad('key-1', 1000, load);

      expect(load).toHaveBeenCalledTimes(2);
    });
  });

  // Phase 10, Module 8 (Caching).
  describe('getOrLoad() metrics', () => {
    it('records a "miss" for the load and a "hit" for the subsequent cached read', async () => {
      const metrics = new MetricsService();
      const cache = new CacheService(new InMemoryCacheStore(), metrics);
      const load = jest.fn(async () => 'value');

      await cache.getOrLoad('tenant-resolve:slug:acme', 1000, load);
      await cache.getOrLoad('tenant-resolve:slug:acme', 1000, load);

      const text = await metrics.getMetrics();
      expect(text).toContain('cache_operations_total{cache_name="tenant-resolve",result="miss"} 1');
      expect(text).toContain('cache_operations_total{cache_name="tenant-resolve",result="hit"} 1');
    });

    it('labels by the key namespace (segment before the first ":"), not the full key', async () => {
      const metrics = new MetricsService();
      const cache = new CacheService(new InMemoryCacheStore(), metrics);

      await cache.getOrLoad('role-keys:tenant-1:user@example.com', 1000, async () => 'v');

      const text = await metrics.getMetrics();
      expect(text).toContain('cache_operations_total{cache_name="role-keys",result="miss"} 1');
      expect(text).not.toContain('tenant-1');
      expect(text).not.toContain('user@example.com');
    });
  });

  describe('size()', () => {
    it('reflects the number of currently-held entries', async () => {
      const cache = createCache();
      await expect(cache.size()).resolves.toBe(0);

      await cache.set('a', 1, 1000);
      await cache.set('b', 2, 1000);

      await expect(cache.size()).resolves.toBe(2);
    });
  });
});
