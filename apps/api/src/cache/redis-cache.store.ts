import { Inject, Injectable } from '@nestjs/common';
import { LOGGER, Logger } from '../logging';
import { CacheStore } from './cache-store.interface';
import { RedisService } from './redis.service';

// Every key this store ever reads/writes is stored under this prefix —
// lets `clear()`/`size()` scan exactly this cache's own keys via `SCAN
// MATCH cache:*` without touching (or needing to know about) anything
// else that might ever share the same Redis instance/database.
const KEY_PREFIX = 'cache:';

const SCAN_BATCH_SIZE = 100;

// Phase 10, Module 8 (Caching) revisit — provisioning a real, shared
// Redis instance (Upstash) turns `RedisService` into what `CacheModule`
// actually wires `CacheService` to in production, replacing
// `InMemoryCacheStore` (still used directly by tests — see that class's
// own header comment). TTL is Redis's own native expiry (`SET ... PX
// ttlMs`) rather than hand-rolled bookkeeping, and — unlike the
// single-process Map — every instance now shares one cache, which is the
// entire point of this revisit (Phase 10's actual multi-instance
// production target).
//
// Resilience: a transient Redis error on any operation is caught and
// logged, then treated as a miss/no-op rather than propagated — a cache
// is best-effort by definition, and the "hottest read paths" this sits in
// front of (see `CacheService.getOrLoad()`'s real callers) should degrade
// to their own uncached path under a brief Redis blip, not fail the
// request outright. Startup connectivity is still fail-fast
// (`RedisService.onModuleInit()`), so this only ever masks a LATER,
// transient failure, never a fundamentally broken configuration.
@Injectable()
export class RedisCacheStore implements CacheStore {
  constructor(
    private readonly redis: RedisService,
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.redis.get(KEY_PREFIX + key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch (error) {
      this.logger.warn('Cache read failed, treating as a miss', { key, error });
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      await this.redis.set(KEY_PREFIX + key, JSON.stringify(value), 'PX', ttlMs);
    } catch (error) {
      this.logger.warn('Cache write failed, value not cached', { key, error });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(KEY_PREFIX + key);
    } catch (error) {
      this.logger.warn('Cache delete failed', { key, error });
    }
  }

  // Redis has no native prefix-delete, so this scans (never `KEYS`, which
  // blocks the whole instance on a large keyspace) then batch-deletes
  // what it finds.
  async deleteByPrefix(prefix: string): Promise<void> {
    try {
      const keys = await this.scanKeys(`${KEY_PREFIX}${prefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn('Cache deleteByPrefix failed', { prefix, error });
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.scanKeys(`${KEY_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.warn('Cache clear failed', { error });
    }
  }

  async size(): Promise<number> {
    try {
      return (await this.scanKeys(`${KEY_PREFIX}*`)).length;
    } catch (error) {
      this.logger.warn('Cache size check failed', { error });
      return 0;
    }
  }

  private async scanKeys(match: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.redis.scan(cursor, 'MATCH', match, 'COUNT', SCAN_BATCH_SIZE);
      keys.push(...batch);
      cursor = next;
    } while (cursor !== '0');
    return keys;
  }
}
