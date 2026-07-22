import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BaseRepository } from '../../database/base.repository';
import { TenantStatus } from '../../../generated/prisma/enums';

// Data-access only — no resolution-priority logic here, that's
// TenantResolver's job (../tenant-resolver.service.ts). "Organization" is
// this milestone's brief's name for what `schema.prisma` models as
// `Tenant` (the platform's own multi-tenancy isolation boundary,
// `CLAUDE.md`'s "tenant_id spine") — there is no separate `Organization`
// table, and this milestone's own "Do NOT Implement: Organization CRUD"
// confirms none should be added. `OrganizationRepository` is a thin,
// purpose-named wrapper over `BaseRepository<PrismaService['tenant']>`,
// not a new entity.
//
// Both methods below fold "validate organization is active" into the
// query itself (`status: ACTIVE`, `deletedAt: null`) via a `findActive*`
// naming convention, matching `AuthRepository.findActiveByEmail()`'s
// existing precedent, rather than a separate boolean `isActive()` check
// callers would have to remember to call.
@Injectable()
export class OrganizationRepository extends BaseRepository<PrismaService['tenant']> {
  constructor(prisma: PrismaService) {
    super(prisma.tenant);
  }

  // Priority 1 (hostname resolution) — TenantResolver extracts a
  // candidate slug from the request's hostname and looks it up here.
  findActiveBySlug(slug: string): ReturnType<PrismaService['tenant']['findFirst']> {
    return this.delegate.findFirst({
      where: { slug, status: TenantStatus.ACTIVE, deletedAt: null },
    });
  }

  // Priority 2 (X-Tenant-ID header) and priority 3 (DEFAULT_TENANT_ID
  // dev fallback) both resolve by id — TenantResolver validates the
  // fallback the same way as any other candidate, rather than trusting
  // the env var blindly.
  findActiveById(id: string): ReturnType<PrismaService['tenant']['findFirst']> {
    return this.delegate.findFirst({
      where: { id, status: TenantStatus.ACTIVE, deletedAt: null },
    });
  }
}
