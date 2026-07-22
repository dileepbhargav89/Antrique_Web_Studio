import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CollectionRepository } from './repositories/collection.repository';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { CollectionListQueryDto } from './dto/collection-list-query.dto';
import { CollectionResponseDto } from './dto/collection-response.dto';
import { toCollectionResponseDto } from './mappers/collection.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CollectionStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Same shape as category.service.ts — see that file's own comment for the
// full reasoning (createdBy/updatedBy/deletedBy deliberately left unset,
// version auto-incremented by the RLS migration's own trigger, P2002
// translated to a clean ConflictException).
@Injectable()
export class CollectionService {
  constructor(private readonly collectionRepository: CollectionRepository) {}

  async create(dto: CreateCollectionDto, tenantId: string): Promise<CollectionResponseDto> {
    try {
      const collection = await this.collectionRepository.create({
        data: {
          tenantId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          status: dto.status ?? CollectionStatus.ACTIVE,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      return toCollectionResponseDto(collection);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A collection with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<CollectionResponseDto> {
    const collection = await this.collectionRepository.findActiveById(id, tenantId);
    if (!collection) {
      throw new NotFoundException(`Collection ${id} not found`);
    }
    return toCollectionResponseDto(collection);
  }

  async list(
    query: CollectionListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<CollectionResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.CollectionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.collectionRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toCollectionResponseDto), total, page, limit);
  }

  async update(
    id: string,
    dto: UpdateCollectionDto,
    tenantId: string,
  ): Promise<CollectionResponseDto> {
    const existing = await this.collectionRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Collection ${id} not found`);
    }

    try {
      const updated = await this.collectionRepository.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          status: dto.status,
          sortOrder: dto.sortOrder,
        },
      });
      return toCollectionResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A collection with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.collectionRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Collection ${id} not found`);
    }

    await this.collectionRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
