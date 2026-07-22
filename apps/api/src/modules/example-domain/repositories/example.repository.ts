import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';

// Reference implementation for Phase 1.2D's repository layer — every
// real future repository (Phase 1.2D.4+) follows this same shape:
// @Injectable(), constructor-inject PrismaService only (never inject it
// into a service directly — see
// docs/architecture/domain-module-guide.md's "Repository layer"), pass
// the one model delegate this repository owns to super().
//
// Targets Setting purely to prove the pattern compiles and resolves
// against a REAL Prisma delegate type — Setting is the least
// "business-domain" model in the schema (tenant key/value config, not
// customer-facing data), chosen for that reason. This is NOT a real
// SettingsRepository meant for business use, matching
// ExampleDomainModule's own "template, not a real domain" framing (see
// its README). No current caller — same "build the capability before
// its first real consumer" pattern already used for
// PrismaService.isHealthy()/RequestContextService/PerformanceLogger.
@Injectable()
export class ExampleRepository extends BaseRepository<PrismaService['setting']> {
  constructor(prisma: PrismaService) {
    super(prisma.setting);
  }
}
