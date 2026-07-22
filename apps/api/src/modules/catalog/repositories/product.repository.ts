import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

const PRODUCT_RELATIONS_INCLUDE = {
  variants: { orderBy: { sortOrder: 'asc' as const } },
  images: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProductInclude;

// Same shape as category.repository.ts/collection.repository.ts — see
// category.repository.ts's own comment for the full reasoning
// (data-access only, structural tenant isolation, $transaction-backed
// pagination).
//
// No ProductVariantRepository/ProductImageRepository exists — this
// milestone's brief lists only CategoryRepository/CollectionRepository/
// ProductRepository, and neither variant nor image gets its own
// controller. Both are written as Prisma NESTED creates through
// createWithRelations() below — Prisma wraps a nested write in an
// implicit transaction, satisfying this milestone's "transactions where
// appropriate" requirement for product creation without a bespoke
// `$transaction` call.
//
// `findActiveById()`/`createWithRelations()`/`updateWithRelations()`
// below call `this.delegate.<method>(...)` directly with a literal args
// object, deliberately NOT going through BaseRepository's inherited
// `findOne()`/`create()`/`update()` — those are typed via
// `ReturnType<TDelegate['create']>` at the BASE CLASS level, which
// collapses Prisma's generic, `include`-conditional return type to its
// default (relation-less) shape; TypeScript can't preserve that
// generic connection through a `ReturnType<>` type-level operation on a
// still-generic method signature. Calling `this.delegate.create(...)`
// directly, inline, with a real literal argument (as every method below
// does) lets normal generic inference work correctly instead, so the
// return type genuinely includes `variants`/`images` when `include` asks
// for them — confirmed via `pnpm typecheck`, not assumed.
@Injectable()
export class ProductRepository extends BaseRepository<PrismaService['product']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.product);
  }

  // The "detail" view (GET /products/:id) — includes variants/images.
  // List rows (findManyPaginated below) deliberately do NOT include
  // either, keeping the list response a lighter summary — see
  // dto/product-response.dto.ts's own comment.
  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: PRODUCT_RELATIONS_INCLUDE,
    });
  }

  // `Unchecked` variants — plain scalar `tenantId`/`categoryId`/
  // `collectionId` fields, matching every other repository/seed.ts's own
  // "tenantId: tenant.id" convention, rather than Prisma's alternative
  // `{ tenant: { connect: { id } } }` relation-connect syntax.
  createWithRelations(data: Prisma.ProductUncheckedCreateInput) {
    return this.delegate.create({ data, include: PRODUCT_RELATIONS_INCLUDE });
  }

  updateWithRelations(id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return this.delegate.update({ where: { id }, data, include: PRODUCT_RELATIONS_INCLUDE });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.ProductWhereInput,
    orderBy: Prisma.ProductOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.ProductWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Milestone 8 (Order Management & Checkout) — that milestone's own
  // brief explicitly directs "Use: ProductRepository" for order-item
  // validation ("Validate product variants"), unlike Milestone 7's own
  // InventoryRepository, which reaches `prisma.productVariant` directly
  // rather than importing this repository (see that class's own header
  // comment and docs/implementation/decisions.md for why the two
  // milestones made different calls). Reaches `this.prisma.productVariant`
  // directly — ProductVariant still has no repository of its own (no
  // independent lifecycle, created only as nested data under `Product`)
  // — the same minimal, deliberate exception this file's own
  // `createWithRelations()`/`updateWithRelations()` nested-write handling
  // already establishes.
  findVariantById(id: string, tenantId: string) {
    return this.prisma.productVariant.findFirst({ where: { id, tenantId } });
  }

  // Milestone 12 (Performance Engineering) — the batched counterpart to
  // `findVariantById()` above, added for callers resolving MULTIPLE
  // variants at once (`OrderService.create()`/`InvoiceService.
  // createFromOrder()`, each validating/describing one variant per order
  // line): one `findMany({ id: { in } })` instead of one `findFirst()`
  // per line item. Empty `ids` short-circuits to an empty array without
  // a round trip — Prisma's own `{ in: [] }` already matches nothing,
  // but skipping the query entirely avoids a wasted connection checkout
  // for the (common) case of an order with zero lines reaching this far.
  findVariantsByIds(ids: string[], tenantId: string) {
    if (ids.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.productVariant.findMany({ where: { id: { in: ids }, tenantId } });
  }

  // Milestone 12 (Performance Engineering) — a lightweight, BATCHED
  // existence check for `BespokeModule`'s own cross-module tenant-
  // ownership validation (`FabricService.assertProductsBelongToTenant()`),
  // replacing one full `findActiveById()` per product id (each pulling
  // the FULL detail shape — nested variants/images — purely to check
  // "does this id exist for this tenant") with one minimal, `select`-
  // projected `findMany()` covering every id at once. Returns just the
  // ids that DO exist — the caller diffs that against its own input list
  // to report exactly which one(s) are missing, so per-item error
  // messages stay identical to before.
  async findExistingIds(ids: string[], tenantId: string): Promise<Set<string>> {
    if (ids.length === 0) {
      return new Set();
    }
    const rows = await this.delegate.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }
}
