import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

const SUPPLIER_RELATIONS_INCLUDE = {
  supplierProducts: true,
} satisfies Prisma.SupplierInclude;

// Data-access only. `SupplierProduct` has no repository/controller of
// its own this milestone (this milestone's brief lists only
// `WarehouseRepository`/`InventoryRepository`/`SupplierRepository` for 6
// entities) — created only as nested data under Supplier's own create/
// update, same "line-item, no independent repository" shape
// ProductVariant/ProductImage got from ProductRepository in Milestone 5.
//
// `productVariantExistsForTenant()`/`fabricExistsForTenant()` duplicate
// `InventoryRepository`'s own two methods rather than sharing them via a
// cross-service dependency — a small, deliberate duplication over
// introducing coupling between Supplier and Inventory for a 3-line
// existence check; see docs/implementation/decisions.md.
@Injectable()
export class SupplierRepository extends BaseRepository<PrismaService['supplier']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.supplier);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: SUPPLIER_RELATIONS_INCLUDE,
    });
  }

  createWithRelations(data: Prisma.SupplierUncheckedCreateInput) {
    return this.delegate.create({ data, include: SUPPLIER_RELATIONS_INCLUDE });
  }

  updateWithRelations(id: string, data: Prisma.SupplierUncheckedUpdateInput) {
    return this.delegate.update({ where: { id }, data, include: SUPPLIER_RELATIONS_INCLUDE });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.SupplierWhereInput,
    orderBy: Prisma.SupplierOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.SupplierWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Full replace of a supplier's product links — delete-then-create in
  // one transaction, same approach
  // `bespoke/repositories/fabric.repository.ts`'s `setProductLinks()`
  // uses. Called from SupplierService.update() when the caller provides
  // a new `products` array.
  async replaceSupplierProducts(
    tenantId: string,
    supplierId: string,
    products: Array<Omit<Prisma.SupplierProductCreateManyInput, 'tenantId' | 'supplierId'>>,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.supplierProduct.deleteMany({ where: { supplierId, tenantId } }),
      this.prisma.supplierProduct.createMany({
        data: products.map((p) => ({ ...p, tenantId, supplierId })),
      }),
    ]);
  }

  async productVariantExistsForTenant(id: string, tenantId: string): Promise<boolean> {
    const row = await this.prisma.productVariant.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    return row !== null;
  }

  async fabricExistsForTenant(id: string, tenantId: string): Promise<boolean> {
    const row = await this.prisma.fabric.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    return row !== null;
  }
}
