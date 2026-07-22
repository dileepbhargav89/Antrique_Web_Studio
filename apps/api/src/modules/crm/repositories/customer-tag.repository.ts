import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// A 5th repository beyond this milestone's own named "Repository Layer"
// list (Lead/CustomerActivity/CustomerNote/FollowUp) — added for the
// same reason `BaseRepository.count()` was in Milestone 5: the
// "Tags" list filter and the `CustomerTag`/`CustomerTagAssignment`
// entities this milestone's own "Core entities" list names would
// otherwise be dead, unreachable schema with nothing to populate them.
// See docs/implementation/decisions.md.
@Injectable()
export class CustomerTagRepository extends BaseRepository<PrismaService['customerTag']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.customerTag);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.CustomerTagWhereInput,
    orderBy: Prisma.CustomerTagOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.CustomerTagWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // "Untag" — a real DELETE, no soft-delete column exists on the join
  // table (see schema.prisma's own `CustomerTagAssignment` comment).
  async assign(tenantId: string, customerId: string, customerTagId: string) {
    return this.prisma.customerTagAssignment.create({
      data: { tenantId, customerId, customerTagId },
    });
  }

  async unassign(tenantId: string, customerId: string, customerTagId: string): Promise<boolean> {
    const result = await this.prisma.customerTagAssignment.deleteMany({
      where: { tenantId, customerId, customerTagId },
    });
    return result.count > 0;
  }

  findAssignmentsForCustomer(customerId: string, tenantId: string) {
    return this.prisma.customerTagAssignment.findMany({
      where: { customerId, tenantId },
      include: { customerTag: true },
    });
  }
}
