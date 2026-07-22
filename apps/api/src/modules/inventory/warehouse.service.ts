import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseListQueryDto } from './dto/warehouse-list-query.dto';
import { WarehouseResponseDto } from './dto/warehouse-response.dto';
import { toWarehouseResponseDto } from './mappers/warehouse.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { WarehouseStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning (createdBy/updatedBy/deletedBy left unset, P2002
// translated to ConflictException).
@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepository: WarehouseRepository) {}

  async create(dto: CreateWarehouseDto, tenantId: string): Promise<WarehouseResponseDto> {
    try {
      const warehouse = await this.warehouseRepository.create({
        data: {
          tenantId,
          name: dto.name,
          slug: dto.slug,
          addressLine1: dto.addressLine1,
          city: dto.city,
          region: dto.region,
          postalCode: dto.postalCode,
          country: dto.country,
          status: dto.status ?? WarehouseStatus.ACTIVE,
        },
      });
      return toWarehouseResponseDto(warehouse);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A warehouse with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<WarehouseResponseDto> {
    const warehouse = await this.warehouseRepository.findActiveById(id, tenantId);
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }
    return toWarehouseResponseDto(warehouse);
  }

  async list(
    query: WarehouseListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<WarehouseResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.WarehouseWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.warehouseRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toWarehouseResponseDto), total, page, limit);
  }

  async update(
    id: string,
    dto: UpdateWarehouseDto,
    tenantId: string,
  ): Promise<WarehouseResponseDto> {
    const existing = await this.warehouseRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }

    try {
      const updated = await this.warehouseRepository.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          addressLine1: dto.addressLine1,
          city: dto.city,
          region: dto.region,
          postalCode: dto.postalCode,
          country: dto.country,
          status: dto.status,
        },
      });
      return toWarehouseResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A warehouse with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.warehouseRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Warehouse ${id} not found`);
    }

    // "Soft delete only when no active inventory exists" — this
    // milestone's own business rule.
    const hasActiveInventory = await this.warehouseRepository.hasActiveInventory(id, tenantId);
    if (hasActiveInventory) {
      throw new UnprocessableEntityException(
        `Warehouse ${id} still has active inventory (on-hand or reserved stock) and cannot be deleted`,
      );
    }

    await this.warehouseRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
