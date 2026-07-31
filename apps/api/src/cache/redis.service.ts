import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import cacheConfig from '../config/cache/cache.config';
import { LOGGER, Logger } from '../logging';

// Phase 10, Module 8 (Caching) revisit — provisioning a real, shared Redis
// instance (Upstash) for the first time turns `cache.config.ts`'s
// previously-unused `redisUrl` into a real client. Extends `Redis` directly
// (the same "no wrapper, inject the client itself" precedent
// `PrismaService extends PrismaClient` already established), so
// `CacheService` calls `get`/`set`/`del`/`scan` on this instance with no
// extra indirection.
@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(cacheConfig.KEY)
    config: ConfigType<typeof cacheConfig>,
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {
    // `lazyConnect: true` — connect explicitly in onModuleInit (below) so a
    // bad REDIS_URL fails startup the same way a bad DATABASE_URL does,
    // rather than ioredis's own default background-retry-forever behavior
    // masking a real misconfiguration. `maxRetriesPerRequest` bounded (not
    // ioredis's default of 20) so a request-path call fails fast instead of
    // hanging behind a long internal retry loop. `family: 4` — confirmed
    // live during this pass: Node/ioredis resolves a bare `localhost` in
    // REDIS_URL to the IPv6 loopback (`::1`) first on this codebase's own
    // Windows dev environment, but Memurai (the local Redis-compatible
    // service used there) only binds IPv4, so an unqualified connection
    // attempt failed with ECONNREFUSED even with a correct REDIS_URL.
    // Forcing IPv4 resolution sidesteps that everywhere Redis is reached
    // by hostname (local dev, and effectively every managed provider,
    // including Upstash) — only a genuinely IPv6-only Redis endpoint would
    // need this reverted, which is not this codebase's own deployment
    // target.
    super(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2, family: 4 });
  }

  // Fail-fast, matching PrismaService.onModuleInit()'s own reasoning: a
  // Redis instance the cache can't reach should stop the app before it
  // serves any request, not fail lazily on the first cache read.
  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      await this.ping();
      this.logger.info('Redis connection established');
    } catch (error) {
      this.logger.error('Redis connection failed', { error });
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.disconnect();
    this.logger.info('Redis connection closed');
  }

  // Consumed by HealthService — unlike the fail-fast onModuleInit() check
  // above, a health check must never throw; a transient outage should
  // surface as `checks.redis: "error"`, not crash the request handling it.
  async isHealthy(): Promise<boolean> {
    try {
      await this.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed', { error });
      return false;
    }
  }
}
