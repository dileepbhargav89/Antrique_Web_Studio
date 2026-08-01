import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../database/base.repository';
import { Prisma } from '../../../generated/prisma/client';

// Thin wrapper over the generic `Setting` key-value store (schema.prisma's
// own doc comment: "feature flags, branding, preferences"). No
// resource-specific columns exist to justify a dedicated model — every
// consumer (branding today, feature flags/preferences later) just needs
// get/upsert-by-key, so this repository stays generic rather than growing
// one bespoke method per future setting key.
@Injectable()
export class SettingRepository extends BaseRepository<PrismaService['setting']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.setting);
  }

  findByKey(tenantId: string, key: string) {
    return this.delegate.findFirst({ where: { tenantId, key } });
  }

  upsertByKey(tenantId: string, key: string, value: Prisma.InputJsonValue, description?: string) {
    return this.prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key } },
      create: { tenantId, key, value, description },
      update: { value, description },
    });
  }
}
