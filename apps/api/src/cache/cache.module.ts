import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { RedisService } from './redis.service';
import { RedisCacheStore } from './redis-cache.store';
import { CACHE_STORE } from './cache.tokens';

// Milestone 12 (Performance Engineering) — application-level caching
// infrastructure, mirroring jwt/'s (TokenModule) and password/'s
// (PasswordModule) exact precedent: @Global() so any future consumer can
// inject CacheService without this module being imported everywhere.
// `AuthorizationModule` is this milestone's own first real consumer
// (see authorization.service.ts's own updated comment) — CacheService is
// exported here, not re-declared as a provider there, the same "shared
// infra lives in its own top-level module" discipline
// TokenService/PasswordService/PrismaService already follow.
//
// `RedisService` (Phase 10, Module 8 revisit) is exported too, separately
// from `CacheService` — `HealthService` needs the raw client for its own
// `checks.redis` probe, not the cache's higher-level get/set semantics.
// `CACHE_STORE` binds to `RedisCacheStore` here — the one place the app's
// real boot path chooses that over `InMemoryCacheStore` (which every
// business-logic test that just needs a working cache double constructs
// directly instead, bypassing this module entirely).
@Global()
@Module({
  providers: [RedisService, { provide: CACHE_STORE, useClass: RedisCacheStore }, CacheService],
  exports: [CacheService, RedisService],
})
export class CacheModule {}
