import { MetricsService } from '../metrics/metrics.service';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get() / set()', () => {
    it('returns undefined for a key that was never set', () => {
      const cache = new CacheService(new MetricsService());

      expect(cache.get('missing')).toBeUndefined();
    });

    it('returns the set value while still within its TTL', () => {
      const cache = new CacheService(new MetricsService());

      cache.set('key-1', { value: 42 }, 1000);

      expect(cache.get('key-1')).toEqual({ value: 42 });
    });

    it('returns undefined and evicts the entry once its TTL has elapsed', () => {
      jest.useFakeTimers().setSystemTime(0);
      const cache = new CacheService(new MetricsService());
      cache.set('key-1', 'fresh', 1000);

      jest.setSystemTime(1001);

      expect(cache.get('key-1')).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    it('does not expire an entry read just before its TTL elapses (boundary is exceeded, not equal)', () => {
      jest.useFakeTimers().setSystemTime(0);
      const cache = new CacheService(new MetricsService());
      cache.set('key-1', 'fresh', 1000);

      jest.setSystemTime(999);

      expect(cache.get('key-1')).toBe('fresh');
    });
  });

  describe('delete() / deleteByPrefix() / clear()', () => {
    it('delete() removes exactly the given key', () => {
      const cache = new CacheService(new MetricsService());
      cache.set('a', 1, 1000);
      cache.set('b', 2, 1000);

      cache.delete('a');

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
    });

    it('deleteByPrefix() removes every key sharing the given prefix, leaving others untouched', () => {
      const cache = new CacheService(new MetricsService());
      cache.set('role-keys:tenant-1:a@x.com', ['admin'], 1000);
      cache.set('role-keys:tenant-1:b@x.com', ['manager'], 1000);
      cache.set('role-keys:tenant-2:a@x.com', ['customer'], 1000);

      cache.deleteByPrefix('role-keys:tenant-1:');

      expect(cache.get('role-keys:tenant-1:a@x.com')).toBeUndefined();
      expect(cache.get('role-keys:tenant-1:b@x.com')).toBeUndefined();
      expect(cache.get('role-keys:tenant-2:a@x.com')).toEqual(['customer']);
    });

    it('clear() empties every entry regardless of key', () => {
      const cache = new CacheService(new MetricsService());
      cache.set('a', 1, 1000);
      cache.set('b', 2, 1000);

      cache.clear();

      expect(cache.size).toBe(0);
    });
  });

  describe('getOrLoad()', () => {
    it('calls load() on a miss and caches the result', async () => {
      const cache = new CacheService(new MetricsService());
      const load = jest.fn(async () => 'loaded-value');

      const result = await cache.getOrLoad('key-1', 1000, load);

      expect(result).toBe('loaded-value');
      expect(load).toHaveBeenCalledTimes(1);
      expect(cache.get('key-1')).toBe('loaded-value');
    });

    it('does not call load() again on a subsequent hit within the TTL', async () => {
      const cache = new CacheService(new MetricsService());
      const load = jest.fn(async () => 'loaded-value');

      await cache.getOrLoad('key-1', 1000, load);
      await cache.getOrLoad('key-1', 1000, load);

      expect(load).toHaveBeenCalledTimes(1);
    });

    it('calls load() again once the cached value has expired', async () => {
      jest.useFakeTimers().setSystemTime(0);
      const cache = new CacheService(new MetricsService());
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
      const cache = new CacheService(metrics);
      const load = jest.fn(async () => 'value');

      await cache.getOrLoad('tenant-resolve:slug:acme', 1000, load);
      await cache.getOrLoad('tenant-resolve:slug:acme', 1000, load);

      const text = await metrics.getMetrics();
      expect(text).toContain('cache_operations_total{cache_name="tenant-resolve",result="miss"} 1');
      expect(text).toContain('cache_operations_total{cache_name="tenant-resolve",result="hit"} 1');
    });

    it('labels by the key namespace (segment before the first ":"), not the full key', async () => {
      const metrics = new MetricsService();
      const cache = new CacheService(metrics);

      await cache.getOrLoad('role-keys:tenant-1:user@example.com', 1000, async () => 'v');

      const text = await metrics.getMetrics();
      expect(text).toContain('cache_operations_total{cache_name="role-keys",result="miss"} 1');
      expect(text).not.toContain('tenant-1');
      expect(text).not.toContain('user@example.com');
    });
  });

  describe('size', () => {
    it('reflects the number of currently-held entries', () => {
      const cache = new CacheService(new MetricsService());
      expect(cache.size).toBe(0);

      cache.set('a', 1, 1000);
      cache.set('b', 2, 1000);

      expect(cache.size).toBe(2);
    });
  });
});
