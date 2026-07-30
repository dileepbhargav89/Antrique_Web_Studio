import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Phase 7 (Enterprise CRM/Project-Management) — `Client` found already
// fully modeled (Phase 1.1A) with zero application-layer consumers, same
// situation Lead itself was in before Milestone 9 (see lead.repository.ts's
// own comment). `createInTx()` exists so `LeadService.convertToClient()`
// can create the Client and update the Lead's own `convertedClientId` in
// one atomic transaction, mirroring `convert()`'s existing Customer
// find-or-create pattern — Client has no `@@unique` constraint to back a
// race-safe find-or-create the way Customer's email uniqueness does, so
// `convertToClient()` always creates a new Client rather than attempting
// to fuzzy-match an existing one (see lead.service.ts's own comment).
@Injectable()
export class ClientRepository extends BaseRepository<PrismaService['client']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.client);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.ClientWhereInput,
    orderBy: Prisma.ClientOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.ClientWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  createInTx(tx: Prisma.TransactionClient, data: Prisma.ClientUncheckedCreateInput) {
    return tx.client.create({ data });
  }
}
