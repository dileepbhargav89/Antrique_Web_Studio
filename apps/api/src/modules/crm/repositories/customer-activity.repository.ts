import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// "Timeline remains append-only" (this milestone's own explicit rule) —
// the same shape `OrderStatusHistory`/`InventoryTransaction` already
// established: no `update()`/soft-delete method exposed here at all, only
// ways to create and read. `createInTx()` exists for the same reason
// `OrderRepository.addStatusHistoryInTx()` does (Milestone 8) — this
// milestone's own "Lead conversion creates CustomerActivity" business
// rule needs the activity row written in the SAME transaction as
// `LeadService.convert()`'s Lead status update and Customer creation/
// link.
@Injectable()
export class CustomerActivityRepository extends BaseRepository<PrismaService['customerActivity']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.customerActivity);
  }

  createInTx(tx: Prisma.TransactionClient, data: Prisma.CustomerActivityUncheckedCreateInput) {
    return tx.customerActivity.create({ data });
  }

  // The full, ordered feed for one customer — "Timeline creation" (this
  // milestone's own explicit business responsibility). Ascending
  // (oldest first, the natural reading order for "what happened to this
  // customer, in order"), unlike `findManyPaginated()` below, which
  // defaults its own list to the general newest-first convention.
  findTimelineForCustomer(customerId: string, tenantId: string) {
    return this.delegate.findMany({
      where: { customerId, tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.CustomerActivityWhereInput,
    orderBy: Prisma.CustomerActivityOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.CustomerActivityWhereInput = { ...where, tenantId };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
