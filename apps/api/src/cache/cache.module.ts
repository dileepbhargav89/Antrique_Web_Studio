import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

// Milestone 12 (Performance Engineering) — application-level caching
// infrastructure, mirroring jwt/'s (TokenModule) and password/'s
// (PasswordModule) exact precedent: @Global() so any future consumer can
// inject CacheService without this module being imported everywhere.
// `AuthorizationModule` is this milestone's own first real consumer
// (see authorization.service.ts's own updated comment) — CacheService is
// exported here, not re-declared as a provider there, the same "shared
// infra lives in its own top-level module" discipline
// TokenService/PasswordService/PrismaService already follow.
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
