import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Phase 9, Module 1, Step 1 (Vendor Management) — same shape
// ClientRepository/TaxRepository/SupplierRepository already establish.
@Injectable()
export class VendorRepository extends BaseRepository<PrismaService['vendor']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.vendor);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.VendorWhereInput,
    orderBy: Prisma.VendorOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.VendorWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
