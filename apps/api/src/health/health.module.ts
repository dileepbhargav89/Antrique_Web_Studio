import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

// Not @Global() — nothing outside this module needs HealthService itself;
// PrismaService (the one real dependency it checks) is already @Global()
// (DatabaseModule), so no cross-module export is needed here either.
@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
