import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FabricRepository } from './repositories/fabric.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateFabricDto } from './dto/create-fabric.dto';
import { UpdateFabricDto } from './dto/update-fabric.dto';
import { FabricListQueryDto } from './dto/fabric-list-query.dto';
import { FabricResponseDto } from './dto/fabric-response.dto';
import { toFabricResponseDto } from './mappers/fabric.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { FabricStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning (createdBy/updatedBy/deletedBy left unset, P2002
// translated to ConflictException).
//
// Also injects ProductRepository (from CatalogModule, exported for
// exactly this — see catalog.module.ts's own comment) to enforce this
// milestone's own "Fabrics belong to the current tenant" business rule
// on the OTHER side of the relationship: every `productId` a caller
// includes in `productIds` must genuinely belong to the caller's tenant
// before this fabric gets linked to it — the same cross-entity
// tenant-ownership pattern ProductService.assertReferencesBelongToTenant()
// established in Milestone 5.
@Injectable()
export class FabricService {
  constructor(
    private readonly fabricRepository: FabricRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async create(dto: CreateFabricDto, tenantId: string): Promise<FabricResponseDto> {
    await this.assertProductsBelongToTenant(dto.productIds, tenantId);

    try {
      const fabric = await this.fabricRepository.createWithRelations({
        tenantId,
        fabricCategoryId: dto.fabricCategoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        composition: dto.composition,
        colorHex: dto.colorHex,
        priceAdjustment: dto.priceAdjustment ?? '0',
        status: dto.status ?? FabricStatus.ACTIVE,
        sortOrder: dto.sortOrder ?? 0,
        images: dto.images
          ? {
              create: dto.images.map((image, index) => ({
                tenantId,
                url: image.url,
                altText: image.altText,
                sortOrder: index,
              })),
            }
          : undefined,
      });

      if (dto.productIds?.length) {
        await this.fabricRepository.setProductLinks(tenantId, fabric.id, dto.productIds);
      }

      return toFabricResponseDto(fabric, fabric.images);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A fabric with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<FabricResponseDto> {
    const fabric = await this.fabricRepository.findActiveById(id, tenantId);
    if (!fabric) {
      throw new NotFoundException(`Fabric ${id} not found`);
    }
    return toFabricResponseDto(fabric, fabric.images);
  }

  async list(
    query: FabricListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<FabricResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.FabricWhereInput = {
      ...(query.fabricCategoryId ? { fabricCategoryId: query.fabricCategoryId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.productId ? { productFabrics: { some: { productId: query.productId } } } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.fabricRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toFabricResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(id: string, dto: UpdateFabricDto, tenantId: string): Promise<FabricResponseDto> {
    const existing = await this.fabricRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Fabric ${id} not found`);
    }
    await this.assertProductsBelongToTenant(dto.productIds, tenantId);

    try {
      const updated = await this.fabricRepository.updateWithRelations(id, {
        fabricCategoryId: dto.fabricCategoryId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        composition: dto.composition,
        colorHex: dto.colorHex,
        priceAdjustment: dto.priceAdjustment,
        status: dto.status,
        sortOrder: dto.sortOrder,
      });

      if (dto.productIds) {
        await this.fabricRepository.setProductLinks(tenantId, id, dto.productIds);
      }

      return toFabricResponseDto(updated, updated.images);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A fabric with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.fabricRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Fabric ${id} not found`);
    }

    await this.fabricRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Milestone 12 (Performance Engineering) — REWRITTEN from one
  // `findActiveById()` per product id (each pulling the full nested
  // variants/images shape, purely to check existence) to a single
  // batched, minimal-projection `findExistingIds()` call — see that
  // repository method's own comment. Same per-item error message for
  // whichever id is missing, preserved by diffing the input list against
  // the returned existing-id set instead of awaiting one query per id.
  private async assertProductsBelongToTenant(
    productIds: string[] | undefined,
    tenantId: string,
  ): Promise<void> {
    if (!productIds?.length) {
      return;
    }
    const existingIds = await this.productRepository.findExistingIds(productIds, tenantId);
    for (const productId of productIds) {
      if (!existingIds.has(productId)) {
        throw new BadRequestException(`Product ${productId} not found`);
      }
    }
  }
}
