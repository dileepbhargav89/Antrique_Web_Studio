import { Logger } from '../logging';
import { RedisCacheStore } from './redis-cache.store';
import { RedisService } from './redis.service';

// A hand-rolled fake of the exact ioredis surface RedisCacheStore calls
// (get/set/del/scan) — not a live Redis connection (see tests/integration/
// for this codebase's own convention for tests that genuinely need one)
// and not an external mocking library, matching this codebase's existing
// preference for plain, explicit fakes over mock frameworks. `scan()`
// returns every match in one page (cursor always `'0'`) since these tests
// never write enough keys to need real pagination — RedisCacheStore's own
// cursor loop still exercises correctly against a single-page fake.
class FakeRedis {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, _mode: 'PX', ttlMs: number): Promise<'OK'> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }

  async scan(
    _cursor: string,
    _matchFlag: 'MATCH',
    pattern: string,
    _countFlag: 'COUNT',
    _count: number,
  ): Promise<[string, string[]]> {
    const regex = new RegExp(
      `^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
    );
    const now = Date.now();
    const keys = [...this.store.entries()]
      .filter(([key, entry]) => regex.test(key) && entry.expiresAt > now)
      .map(([key]) => key);
    return ['0', keys];
  }
}

function createFakeLogger(): Logger {
  return {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };
}

describe('RedisCacheStore', () => {
  it('round-trips a value through get()/set()', async () => {
    const store = new RedisCacheStore(
      new FakeRedis() as unknown as RedisService,
      createFakeLogger(),
    );

    await store.set('key-1', { value: 42 }, 1000);

    await expect(store.get('key-1')).resolves.toEqual({ value: 42 });
  });

  it('namespaces every key under a fixed prefix so clear() never touches an unrelated key', async () => {
    const redis = new FakeRedis();
    const store = new RedisCacheStore(redis as unknown as RedisService, createFakeLogger());
    await redis.set('not-ours:some-other-app-key', 'untouched', 'PX', 60_000);

    await store.set('a', 1, 1000);
    await store.clear();

    await expect(redis.get('not-ours:some-other-app-key')).resolves.toBe('untouched');
  });

  it('deleteByPrefix() removes every key sharing the given prefix, leaving others untouched', async () => {
    const store = new RedisCacheStore(
      new FakeRedis() as unknown as RedisService,
      createFakeLogger(),
    );
    await store.set('role-keys:tenant-1:a@x.com', ['admin'], 1000);
    await store.set('role-keys:tenant-1:b@x.com', ['manager'], 1000);
    await store.set('role-keys:tenant-2:a@x.com', ['customer'], 1000);

    await store.deleteByPrefix('role-keys:tenant-1:');

    await expect(store.get('role-keys:tenant-1:a@x.com')).resolves.toBeUndefined();
    await expect(store.get('role-keys:tenant-1:b@x.com')).resolves.toBeUndefined();
    await expect(store.get('role-keys:tenant-2:a@x.com')).resolves.toEqual(['customer']);
  });

  it('size() reflects the number of currently-held entries', async () => {
    const store = new RedisCacheStore(
      new FakeRedis() as unknown as RedisService,
      createFakeLogger(),
    );
    await expect(store.size()).resolves.toBe(0);

    await store.set('a', 1, 1000);
    await store.set('b', 2, 1000);

    await expect(store.size()).resolves.toBe(2);
  });

  describe('resilience', () => {
    it('get() treats a Redis error as a miss instead of throwing', async () => {
      const redis = {
        get: jest.fn().mockRejectedValue(new Error('connection reset')),
      } as unknown as RedisService;
      const logger = createFakeLogger();
      const store = new RedisCacheStore(redis, logger);

      await expect(store.get('key-1')).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('set() swallows a Redis error instead of throwing', async () => {
      const redis = {
        set: jest.fn().mockRejectedValue(new Error('connection reset')),
      } as unknown as RedisService;
      const logger = createFakeLogger();
      const store = new RedisCacheStore(redis, logger);

      await expect(store.set('key-1', 'value', 1000)).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('deleteByPrefix() swallows a Redis error instead of throwing', async () => {
      const redis = {
        scan: jest.fn().mockRejectedValue(new Error('connection reset')),
      } as unknown as RedisService;
      const logger = createFakeLogger();
      const store = new RedisCacheStore(redis, logger);

      await expect(store.deleteByPrefix('role-keys:')).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
