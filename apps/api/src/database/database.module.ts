import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantRlsContextService } from './tenant-rls-context.service';

// The one place PrismaClient is constructed — @Global() so every future
// domain module's repository (Phase 1.2D.3+) can inject PrismaService
// without importing DatabaseModule itself, matching ConfigModule/
// LoggingModule's existing precedent (see
// docs/architecture/domain-module-guide.md "Import rules" and
// backend.md §3). Exports exactly one provider — no repositories, no
// business logic, no model-specific helpers live here (see
// prisma.service.ts's own header comment for why).
@Global()
@Module({
  providers: [PrismaService, TenantRlsContextService],
  exports: [PrismaService, TenantRlsContextService],
})
export class DatabaseModule {}
