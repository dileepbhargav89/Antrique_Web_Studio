import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

// Naming note (see bespoke module's own header comment in schema.prisma):
// this milestone's brief names both the repository and the controller
// after `StyleOption` (not `StyleOptionGroup`) — this class targets
// StyleOption directly, referencing an existing `styleOptionGroupId`.
// `StyleOptionGroup` has no repository of its own: it's created only as
// nested data under ProductCustomizationRepository (see that file), so
// the two small group-lookup methods below reach `this.prisma.styleOptionGroup`
// directly rather than going through a dedicated repository that doesn't
// exist — the same kind of minimal, deliberate exception
// product.repository.ts's own nested-write handling already establishes
// for entities with no independent repository.
@Injectable()
export class StyleOptionRepository extends BaseRepository<PrismaService['styleOption']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.styleOption);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.StyleOptionWhereInput,
    orderBy: Prisma.StyleOptionOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.StyleOptionWhereInput = { ...where, tenantId, deletedAt: null };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Used by StyleOptionService to validate a client-supplied
  // `styleOptionGroupId` genuinely belongs to the caller's tenant (and,
  // transitively via `productCustomization.productId`, to a specific
  // product) before letting a StyleOption reference it — the same
  // cross-entity tenant-ownership pattern
  // ProductService.assertReferencesBelongToTenant() established in
  // Milestone 5.
  findGroupById(groupId: string, tenantId: string) {
    return this.prisma.styleOptionGroup.findFirst({
      where: { id: groupId, tenantId },
      include: { productCustomization: true },
    });
  }

  // Replaces the full set of "X is incompatible with Y" rules for one
  // style option — delete-then-create in one transaction, same "full
  // replace" approach measurement.repository.ts uses. Stored
  // one-directionally (styleOptionAId < styleOptionBId, enforced here, not
  // by the schema — see schema.prisma's own comment on
  // StyleOptionIncompatibility), so both directions from `styleOptionId`'s
  // perspective must be cleared and re-created together.
  async setIncompatibilities(
    tenantId: string,
    styleOptionId: string,
    incompatibleWithIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.styleOptionIncompatibility.deleteMany({
        where: {
          tenantId,
          OR: [{ styleOptionAId: styleOptionId }, { styleOptionBId: styleOptionId }],
        },
      }),
      this.prisma.styleOptionIncompatibility.createMany({
        data: incompatibleWithIds.map((otherId) => {
          const [styleOptionAId, styleOptionBId] =
            styleOptionId < otherId ? [styleOptionId, otherId] : [otherId, styleOptionId];
          return { tenantId, styleOptionAId, styleOptionBId };
        }),
      }),
    ]);
  }

  // Both directions — A→B rows and B→A rows — since the pair is stored
  // once, sorted, regardless of which side asks.
  findIncompatibilities(tenantId: string, styleOptionId: string) {
    return this.prisma.styleOptionIncompatibility.findMany({
      where: {
        tenantId,
        OR: [{ styleOptionAId: styleOptionId }, { styleOptionBId: styleOptionId }],
      },
    });
  }
}
