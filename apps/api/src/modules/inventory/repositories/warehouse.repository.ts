import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Data-access only — no validation, no business rules; that's
// WarehouseService's job. Same shape as
// modules/catalog/repositories/category.repository.ts — see that file's
// own comment for the full reasoning (structural tenant isolation,
// `$transaction`-backed pagination).
@Injectable()
export class WarehouseRepository extends BaseRepository<PrismaService['warehouse']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.warehouse);
  }

  findActiveById(
    id: string,
    tenantId: string,
  ): ReturnType<PrismaService['warehouse']['findFirst']> {
    return this.delegate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.WarehouseWhereInput,
    orderBy: Prisma.WarehouseOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.WarehouseWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Used by WarehouseService.remove() to enforce "Soft delete only when
  // no active inventory exists" (this milestone's own business rule) —
  // a warehouse with any InventoryItem still holding on-hand or reserved
  // stock cannot be deleted.
  async hasActiveInventory(warehouseId: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.inventoryItem.count({
      where: {
        warehouseId,
        tenantId,
        deletedAt: null,
        OR: [{ onHand: { gt: 0 } }, { reserved: { gt: 0 } }],
      },
    });
    return count > 0;
  }
}
