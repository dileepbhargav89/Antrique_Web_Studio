import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

const PRODUCT_CUSTOMIZATION_RELATIONS_INCLUDE = {
  styleOptionGroups: {
    orderBy: { sortOrder: 'asc' as const },
    include: { styleOptions: { orderBy: { sortOrder: 'asc' as const } } },
  },
  pricingAdjustments: true,
  monogramOptions: true,
} satisfies Prisma.ProductCustomizationInclude;

// Same shape as product.repository.ts's own ProductRepository — the
// aggregate root for this milestone's central entity, with
// StyleOptionGroups (each with their own initial StyleOptions),
// PricingAdjustments, and MonogramOptions all created together via
// Prisma's nested-write `create` (implicit transaction — "transactions
// where appropriate" for this operation, no bespoke `$transaction`
// needed). `update()` deliberately does NOT accept nested arrays — see
// product-customization.service.ts's own comment, the same "no nested
// reconciliation on update" discipline Milestone 5 established for
// Product.update() not touching variants/images.
@Injectable()
export class ProductCustomizationRepository extends BaseRepository<
  PrismaService['productCustomization']
> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.productCustomization);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: PRODUCT_CUSTOMIZATION_RELATIONS_INCLUDE,
    });
  }

  findActiveByProductId(productId: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { productId, tenantId, deletedAt: null },
      include: PRODUCT_CUSTOMIZATION_RELATIONS_INCLUDE,
    });
  }

  createWithRelations(data: Prisma.ProductCustomizationUncheckedCreateInput) {
    return this.delegate.create({ data, include: PRODUCT_CUSTOMIZATION_RELATIONS_INCLUDE });
  }

  // Scalar-only update (no nested arrays accepted) — still returns the
  // full nested shape so callers don't need a second round-trip.
  updateWithRelations(id: string, data: Prisma.ProductCustomizationUncheckedUpdateInput) {
    return this.delegate.update({
      where: { id },
      data,
      include: PRODUCT_CUSTOMIZATION_RELATIONS_INCLUDE,
    });
  }

  // Unlike catalog's own list/detail split, list rows here ARE fully
  // populated with the deep include — see
  // product-customization-response.dto.ts's own comment: a
  // ProductCustomization without its style groups/pricing/monogram
  // configuration is a near-useless summary, unlike a Product without its
  // secondary variants/images.
  async findManyPaginated(
    tenantId: string,
    where: Prisma.ProductCustomizationWhereInput,
    orderBy: Prisma.ProductCustomizationOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.ProductCustomizationWhereInput = {
      ...where,
      tenantId,
      deletedAt: null,
    };
    // NOT consolidated into BaseRepository.findManyAndCount() (architecture
    // review, Backend v1.0) unlike every other repository's identical-
    // shaped pagination method — this one passes `include`, which changes
    // Prisma's own inferred findMany() return type per call (the
    // ProductCustomization + its style groups/pricing/monogram
    // configuration, not the bare row); the generic helper's fixed
    // `ReturnType<TDelegate['findMany']>` can't follow an argument-
    // dependent return type, so consolidating this one would have quietly
    // narrowed `items`' type and broken product-customization.service.ts's
    // own consumption of the included relations. Kept explicit here
    // rather than force a real type-safety loss for the sake of
    // uniformity.
    const [items, total] = await this.prisma.$transaction([
      this.delegate.findMany({
        where: scopedWhere,
        orderBy,
        skip,
        take,
        include: PRODUCT_CUSTOMIZATION_RELATIONS_INCLUDE,
      }),
      this.delegate.count({ where: scopedWhere }),
    ]);
    return { items, total };
  }

  // Full replace of a customization's pricing adjustments — delete-then-
  // create in one transaction, called from
  // ProductCustomizationService.update() when the caller provides a new
  // `pricingAdjustments` array. Unlike StyleOptionGroups (structural, set
  // once at create — see this class's own header comment), pricing rules
  // are expected to be refined over time, the same "mutable data, not
  // one-time structure" reasoning MeasurementProfile.measurements gets.
  async replacePricingAdjustments(
    tenantId: string,
    productCustomizationId: string,
    adjustments: Array<
      Omit<Prisma.PricingAdjustmentCreateManyInput, 'tenantId' | 'productCustomizationId'>
    >,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.pricingAdjustment.deleteMany({ where: { productCustomizationId, tenantId } }),
      this.prisma.pricingAdjustment.createMany({
        data: adjustments.map((a) => ({ ...a, tenantId, productCustomizationId })),
      }),
    ]);
  }

  async replaceMonogramOptions(
    tenantId: string,
    productCustomizationId: string,
    monogramOptions: Array<
      Omit<Prisma.MonogramOptionCreateManyInput, 'tenantId' | 'productCustomizationId'>
    >,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.monogramOption.deleteMany({ where: { productCustomizationId, tenantId } }),
      this.prisma.monogramOption.createMany({
        data: monogramOptions.map((m) => ({ ...m, tenantId, productCustomizationId })),
      }),
    ]);
  }
}
