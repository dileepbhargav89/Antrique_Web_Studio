import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Named "TaxRepository" (not "TaxRateRepository") per this milestone's
// own explicit "Repository Layer" list, targeting the `TaxRate` model —
// same "brief's own naming taken literally, even where it's slightly
// inconsistent with the entity name" precedent Milestone 6's own
// MeasurementProfile/MeasurementRepository asymmetry already
// established (see domain-module-guide.md).
@Injectable()
export class TaxRepository extends BaseRepository<PrismaService['taxRate']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.taxRate);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.TaxRateWhereInput,
    orderBy: Prisma.TaxRateOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.TaxRateWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }
}
