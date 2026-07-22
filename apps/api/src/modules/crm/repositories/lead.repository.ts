import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';
import { LEAD_ACTIVE_STATUSES } from '../constants/crm.constant';

// The CRM pipeline's aggregate root — this milestone's architecture audit
// found `Lead` already fully modeled (Phase 1.1A) with zero application-
// layer consumers; this is its first real repository. `runInTransaction()`/
// `updateInTx()` exist for the same reason Order's own transaction-
// threading pattern does (Milestone 8, domain-module-guide.md §19):
// `LeadService.convert()` needs to create/link a Customer (a DIFFERENT
// module's entity, via `CustomerRepository`) and write a
// `CustomerActivity` (this module's own append-only timeline) in the SAME
// atomic unit as the Lead's own status update — "Lead conversion creates
// CustomerActivity," this milestone's own explicit business rule.
@Injectable()
export class LeadRepository extends BaseRepository<PrismaService['lead']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.lead);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.LeadWhereInput,
    orderBy: Prisma.LeadOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.LeadWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // "Prevent duplicate active leads" — one existence check, tenant- and
  // email-scoped, restricted to non-terminal statuses (a lead that
  // already converted or was archived doesn't block a genuinely new
  // pipeline entry for the same contact). Excludes `excludeLeadId` so
  // `LeadService.update()` can run this same check without a lead always
  // colliding with itself.
  async findActiveByEmail(email: string, tenantId: string, excludeLeadId?: string) {
    return this.delegate.findFirst({
      where: {
        tenantId,
        contactEmail: email,
        status: { in: [...LEAD_ACTIVE_STATUSES] },
        deletedAt: null,
        ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
      },
    });
  }

  runInTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }

  // Used by LeadService to resolve `leadSourceId` into the legacy
  // NOT NULL `source` string column (see create-lead.dto.ts's own
  // comment) — a small existence-check reaching `this.prisma.leadSource`
  // directly rather than a whole separate `LeadSourceRepository`, since
  // `LeadSource` has no repository/controller of its own this milestone
  // (see docs/implementation/decisions.md).
  findActiveLeadSourceById(id: string, tenantId: string) {
    return this.prisma.leadSource.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  updateInTx(tx: Prisma.TransactionClient, id: string, data: Prisma.LeadUncheckedUpdateInput) {
    return tx.lead.update({ where: { id }, data });
  }

  createInTx(tx: Prisma.TransactionClient, data: Prisma.LeadUncheckedCreateInput) {
    return tx.lead.create({ data });
  }
}
