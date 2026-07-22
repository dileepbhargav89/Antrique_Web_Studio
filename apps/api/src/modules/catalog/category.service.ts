import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from './repositories/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { toCategoryResponseDto } from './mappers/category.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CategoryStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping (this milestone's
// own "Service Layer" responsibilities) — CategoryController stays thin,
// CategoryRepository stays a plain data-access class with no knowledge of
// DTOs/HTTP exceptions.
//
// `createdBy`/`updatedBy`/`deletedBy` are deliberately left unset
// (`null`) by every method here — a known, accepted gap, not an
// oversight: `RequestUser` (Milestone 2, unchanged since) is deliberately
// `{ email }` only, with no `userId`, so there is no user identifier
// anywhere in the request pipeline yet to populate these nullable audit
// columns with. Resolving the caller's `User.id` from their email on
// every write (an extra query per mutation, purely to fill an optional
// audit column) was considered and rejected as scope this milestone's
// own brief never asked for; see docs/implementation/decisions.md.
@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(dto: CreateCategoryDto, tenantId: string): Promise<CategoryResponseDto> {
    try {
      const category = await this.categoryRepository.create({
        data: {
          tenantId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          status: dto.status ?? CategoryStatus.ACTIVE,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      return toCategoryResponseDto(category);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A category with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findActiveById(id, tenantId);
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return toCategoryResponseDto(category);
  }

  async list(
    query: CategoryListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<CategoryResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.CategoryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.categoryRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toCategoryResponseDto), total, page, limit);
  }

  async update(id: string, dto: UpdateCategoryDto, tenantId: string): Promise<CategoryResponseDto> {
    // Verify existence + tenant ownership by id BEFORE mutating by id
    // alone — this is what makes the plain `where: { id }` in
    // categoryRepository.update() below safe: a client-supplied id that
    // doesn't belong to the caller's tenant, or doesn't exist, is
    // rejected here, never reaching the mutation.
    const existing = await this.categoryRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    try {
      // No manual `version: { increment: 1 }` — the RLS migration's own
      // Postgres trigger (see 20260717091500_row_level_security)
      // increments `version` unconditionally on every UPDATE, regardless
      // of what the application sets.
      const updated = await this.categoryRepository.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          status: dto.status,
          sortOrder: dto.sortOrder,
        },
      });
      return toCategoryResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A category with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.categoryRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    // Soft delete only — deletedAt/deletedBy, never a real DELETE.
    await this.categoryRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
