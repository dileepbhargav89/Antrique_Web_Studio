import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { CategoryRepository } from './repositories/category.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { toProductResponseDto } from './mappers/product.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ProductStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// category.service.ts's own header comment for the shared reasoning
// (createdBy/updatedBy/deletedBy left unset, version auto-incremented by
// the RLS migration's trigger, P2002 translated to ConflictException).
//
// Also injects CategoryRepository/CollectionRepository (not just its own
// ProductRepository) — "repository orchestration" (this milestone's own
// listed Service Layer responsibility), used specifically to validate
// that a client-supplied `categoryId`/`collectionId` genuinely belongs to
// the caller's own tenant before letting a Product reference it. Without
// this check, a client could pass ANY UUID — including a real category
// belonging to a DIFFERENT tenant — and Postgres's FK constraint alone
// would happily accept it (the FK only requires the referenced row to
// exist, not that it belongs to the same tenant); that would be a real
// cross-tenant reference leak, exactly the class of bug "never trust
// client-supplied tenant identifiers" (this milestone's own requirement)
// warns against, extended to any client-supplied *foreign* id, not just
// an explicit tenant id.
@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly collectionRepository: CollectionRepository,
  ) {}

  async create(dto: CreateProductDto, tenantId: string): Promise<ProductResponseDto> {
    await this.assertReferencesBelongToTenant(dto.categoryId, dto.collectionId, tenantId);

    try {
      const product = await this.productRepository.createWithRelations({
        tenantId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        categoryId: dto.categoryId,
        collectionId: dto.collectionId,
        status: dto.status ?? ProductStatus.DRAFT,
        sortOrder: dto.sortOrder ?? 0,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
        variants: dto.variants
          ? {
              create: dto.variants.map((v) => ({
                tenantId,
                sku: v.sku,
                name: v.name,
                attributes: v.attributes as Prisma.InputJsonValue | undefined,
                price: v.price,
                isActive: v.isActive ?? true,
              })),
            }
          : undefined,
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
      return toProductResponseDto(product, product.variants, product.images);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        // Genuinely ambiguous which field conflicted — this single
        // nested-write transaction inserts the Product's own `slug` AND
        // every variant's `sku` together, so a P2002 here could be
        // either (confirmed live: reusing a variant's sku from an
        // earlier, since-soft-deleted product triggers this exact path,
        // since ProductVariant has no soft-delete of its own — see
        // schema.prisma's own comment). Naming only "slug" would
        // actively mislead in the sku-conflict case.
        throw new ConflictException(
          `A product with slug "${dto.slug}", or one of its variant SKUs, already exists`,
        );
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<ProductResponseDto> {
    const product = await this.productRepository.findActiveById(id, tenantId);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return toProductResponseDto(product, product.variants, product.images);
  }

  async list(
    query: ProductListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<ProductResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.ProductWhereInput = {
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.collectionId ? { collectionId: query.collectionId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.productRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    // No variants/images on list rows (see dto/product-response.dto.ts).
    return new PaginatedResponseDto(
      items.map((item) => toProductResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(id: string, dto: UpdateProductDto, tenantId: string): Promise<ProductResponseDto> {
    const existing = await this.productRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    await this.assertReferencesBelongToTenant(dto.categoryId, dto.collectionId, tenantId);

    try {
      const updated = await this.productRepository.updateWithRelations(id, {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        categoryId: dto.categoryId,
        collectionId: dto.collectionId,
        status: dto.status,
        sortOrder: dto.sortOrder,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      });
      return toProductResponseDto(updated, updated.variants, updated.images);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A product with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.productRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    // Soft-deletes the Product only — variants/images are never
    // independently manageable this milestone (see this class's own
    // header comment), and become unreachable through the API the moment
    // their parent Product is soft-deleted (every read goes through
    // findActiveById()/findManyPaginated(), both already excluding
    // soft-deleted products), so there is nothing further to cascade at
    // the application layer.
    await this.productRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertReferencesBelongToTenant(
    categoryId: string | undefined,
    collectionId: string | undefined,
    tenantId: string,
  ): Promise<void> {
    if (categoryId) {
      const category = await this.categoryRepository.findActiveById(categoryId, tenantId);
      if (!category) {
        throw new BadRequestException(`Category ${categoryId} not found`);
      }
    }
    if (collectionId) {
      const collection = await this.collectionRepository.findActiveById(collectionId, tenantId);
      if (!collection) {
        throw new BadRequestException(`Collection ${collectionId} not found`);
      }
    }
  }
}
