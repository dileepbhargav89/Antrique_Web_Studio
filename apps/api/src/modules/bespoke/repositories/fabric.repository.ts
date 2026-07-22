import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

const FABRIC_RELATIONS_INCLUDE = {
  images: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.FabricInclude;

// Data-access only (this milestone's own requirement) — no validation, no
// business rules; that's FabricService's job. Same shape as
// modules/catalog/repositories/product.repository.ts: constructor-injects
// PrismaService (kept as `this.prisma`, not just handed to super()) so
// `findManyPaginated()`/`setProductLinks()` below can also reach
// `this.prisma.$transaction()`/`this.prisma.productFabric`. Tenant
// isolation is structural — `tenantId` is a mandatory, separate parameter
// on every method, never something a caller assembles into an arbitrary
// `where` object.
//
// `findActiveById()`/`createWithRelations()`/`updateWithRelations()` call
// `this.delegate.<method>(...)` directly with a literal args object,
// deliberately NOT going through BaseRepository's inherited generic
// methods — see domain-module-guide.md §16 / product.repository.ts's own
// comment for why (Prisma's `include`-conditional return type doesn't
// survive a `ReturnType<>` type-level operation on a still-generic base
// method).
@Injectable()
export class FabricRepository extends BaseRepository<PrismaService['fabric']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.fabric);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: FABRIC_RELATIONS_INCLUDE,
    });
  }

  createWithRelations(data: Prisma.FabricUncheckedCreateInput) {
    return this.delegate.create({ data, include: FABRIC_RELATIONS_INCLUDE });
  }

  updateWithRelations(id: string, data: Prisma.FabricUncheckedUpdateInput) {
    return this.delegate.update({ where: { id }, data, include: FABRIC_RELATIONS_INCLUDE });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.FabricWhereInput,
    orderBy: Prisma.FabricOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.FabricWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Replaces the full set of ProductFabric links for one fabric — the
  // many-to-many "Product → Fabrics" join this milestone's brief lists as
  // a relationship but not a controller of its own (see schema.prisma's
  // own comment on product_fabrics); managed through Fabric's existing
  // create/update surface via an optional `productIds` field, not a new
  // endpoint. Delete-then-create in one transaction, same "full replace,
  // not diffed" approach measurement.repository.ts uses for a profile's
  // nested measurements — avoids a transiently-inconsistent link set
  // under concurrent reads.
  async setProductLinks(tenantId: string, fabricId: string, productIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.productFabric.deleteMany({ where: { fabricId, tenantId } }),
      this.prisma.productFabric.createMany({
        data: productIds.map((productId) => ({ tenantId, productId, fabricId })),
      }),
    ]);
  }
}
