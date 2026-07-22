import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { BaseRepository } from '../../../database/base.repository';
import { Prisma } from '../../../../generated/prisma/client';

const MEASUREMENT_PROFILE_RELATIONS_INCLUDE = {
  measurements: true,
} satisfies Prisma.MeasurementProfileInclude;

// Naming note (see bespoke module's own header comment in schema.prisma):
// this milestone's brief names the repository "MeasurementRepository" and
// the controller "Measurement Profiles" — read literally, this class is
// the aggregate-root repository for `MeasurementProfile`, with
// `Measurement` rows as nested children (same "line-item, no independent
// repository" shape ProductVariant/ProductImage got from ProductRepository
// in Milestone 5). There is no separate MeasurementRepository targeting
// the `Measurement` model itself.
@Injectable()
export class MeasurementRepository extends BaseRepository<PrismaService['measurementProfile']> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.measurementProfile);
  }

  findActiveById(id: string, tenantId: string) {
    return this.delegate.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: MEASUREMENT_PROFILE_RELATIONS_INCLUDE,
    });
  }

  createWithRelations(data: Prisma.MeasurementProfileUncheckedCreateInput) {
    return this.delegate.create({ data, include: MEASUREMENT_PROFILE_RELATIONS_INCLUDE });
  }

  updateWithRelations(id: string, data: Prisma.MeasurementProfileUncheckedUpdateInput) {
    return this.delegate.update({
      where: { id },
      data,
      include: MEASUREMENT_PROFILE_RELATIONS_INCLUDE,
    });
  }

  async findManyPaginated(
    tenantId: string,
    where: Prisma.MeasurementProfileWhereInput,
    orderBy: Prisma.MeasurementProfileOrderByWithRelationInput,
    skip: number,
    take: number,
  ) {
    const scopedWhere: Prisma.MeasurementProfileWhereInput = {
      ...where,
      tenantId,
      deletedAt: null,
    };
    return this.findManyAndCount(this.prisma, { where: scopedWhere, orderBy, skip, take });
  }

  // Full replace of a profile's measurements — delete-then-create in one
  // transaction, called from MeasurementService.update() when the caller
  // provides a new `measurements` array (see that service's own comment
  // on why this milestone allows re-submitting measurements on update,
  // unlike Milestone 5's immutable-after-create variants/images). The
  // "Measurement names are unique within a profile" business rule is
  // enforced both here (DB unique constraint, translated to 409 by the
  // service) and at the DTO level (no duplicate names within one array).
  async replaceMeasurements(
    tenantId: string,
    measurementProfileId: string,
    measurements: Array<{
      name: string;
      value: string;
      unit: Prisma.MeasurementCreateInput['unit'];
      notes?: string;
    }>,
  ) {
    await this.prisma.$transaction([
      this.prisma.measurement.deleteMany({ where: { measurementProfileId, tenantId } }),
      this.prisma.measurement.createMany({
        data: measurements.map((m) => ({ ...m, tenantId, measurementProfileId })),
      }),
    ]);
    return this.findActiveById(measurementProfileId, tenantId);
  }

  // Used by MeasurementService to validate a client-supplied `userId`
  // genuinely belongs to the caller's tenant before letting a
  // MeasurementProfile reference it — the same cross-entity
  // tenant-ownership pattern as StyleOptionRepository.findGroupById(),
  // reaching `this.prisma.user` directly since no dedicated
  // cross-module User repository is worth importing for this one check.
  async userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true },
    });
    return user !== null;
  }
}
