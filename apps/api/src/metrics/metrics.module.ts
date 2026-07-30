import { Global, Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

// Phase 10, Module 6 (Monitoring) — @Global(), same precedent as
// TokenModule/PasswordModule/CacheModule/JobsModule: infrastructure
// consumed from other modules (`HttpLoggingMiddleware`/`PrismaService`/
// `InMemoryDeadLetterStore`) that would otherwise each need to import
// this module themselves. Registered once in `app.module.ts`, ahead of
// anything that consumes `MetricsService`.
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
