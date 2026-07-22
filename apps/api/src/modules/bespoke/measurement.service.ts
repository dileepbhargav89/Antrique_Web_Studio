import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MeasurementRepository } from './repositories/measurement.repository';
import { CreateMeasurementProfileDto } from './dto/create-measurement-profile.dto';
import { UpdateMeasurementProfileDto } from './dto/update-measurement-profile.dto';
import { MeasurementProfileListQueryDto } from './dto/measurement-profile-list-query.dto';
import { MeasurementProfileResponseDto } from './dto/measurement-profile-response.dto';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { toMeasurementProfileResponseDto } from './mappers/measurement-profile.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma } from '../../../generated/prisma/client';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning (createdBy/updatedBy/deletedBy left unset).
//
// This milestone's own "Measurement names are unique within a profile"
// business rule is enforced HERE, in the DTO array itself, before ever
// reaching the database — `assertUniqueMeasurementNames()` below — in
// addition to the DB-level unique constraint
// (`measurements_measurement_profile_id_name_key`) that catches the case
// this pre-check can't see (a name colliding with one already stored from
// an earlier request). Both layers matter: the DB constraint is the
// backstop that's always correct; the pre-check gives a clearer, single-
// request error instead of a generic P2002.
@Injectable()
export class MeasurementService {
  constructor(private readonly measurementRepository: MeasurementRepository) {}

  async create(
    dto: CreateMeasurementProfileDto,
    tenantId: string,
  ): Promise<MeasurementProfileResponseDto> {
    this.assertUniqueMeasurementNames(dto.measurements);
    await this.assertUserBelongsToTenant(dto.userId, tenantId);

    const profile = await this.measurementRepository.createWithRelations({
      tenantId,
      userId: dto.userId,
      name: dto.name,
      notes: dto.notes,
      measurements: dto.measurements
        ? {
            create: dto.measurements.map((m) => ({
              tenantId,
              name: m.name,
              value: m.value,
              unit: m.unit,
              notes: m.notes,
            })),
          }
        : undefined,
    });
    return toMeasurementProfileResponseDto(profile, profile.measurements);
  }

  async findById(id: string, tenantId: string): Promise<MeasurementProfileResponseDto> {
    const profile = await this.measurementRepository.findActiveById(id, tenantId);
    if (!profile) {
      throw new NotFoundException(`Measurement profile ${id} not found`);
    }
    return toMeasurementProfileResponseDto(profile, profile.measurements);
  }

  async list(
    query: MeasurementProfileListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<MeasurementProfileResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.MeasurementProfileWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.measurementRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toMeasurementProfileResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(
    id: string,
    dto: UpdateMeasurementProfileDto,
    tenantId: string,
  ): Promise<MeasurementProfileResponseDto> {
    const existing = await this.measurementRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Measurement profile ${id} not found`);
    }
    this.assertUniqueMeasurementNames(dto.measurements);
    await this.assertUserBelongsToTenant(dto.userId, tenantId);

    const updated = await this.measurementRepository.updateWithRelations(id, {
      name: dto.name,
      userId: dto.userId,
      notes: dto.notes,
    });

    if (dto.measurements) {
      const withMeasurements = await this.measurementRepository.replaceMeasurements(
        tenantId,
        id,
        dto.measurements,
      );
      return toMeasurementProfileResponseDto(withMeasurements!, withMeasurements!.measurements);
    }

    return toMeasurementProfileResponseDto(updated, updated.measurements);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.measurementRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Measurement profile ${id} not found`);
    }

    await this.measurementRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private assertUniqueMeasurementNames(measurements: CreateMeasurementDto[] | undefined): void {
    if (!measurements?.length) {
      return;
    }
    const seen = new Set<string>();
    for (const m of measurements) {
      const key = m.name.trim().toLowerCase();
      if (seen.has(key)) {
        throw new BadRequestException(
          `Measurement name "${m.name}" is duplicated — names must be unique within a profile`,
        );
      }
      seen.add(key);
    }
  }

  private async assertUserBelongsToTenant(
    userId: string | undefined,
    tenantId: string,
  ): Promise<void> {
    if (!userId) {
      return;
    }
    const belongs = await this.measurementRepository.userBelongsToTenant(userId, tenantId);
    if (!belongs) {
      throw new BadRequestException(`User ${userId} not found`);
    }
  }
}
