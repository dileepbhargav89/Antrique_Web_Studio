import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductCustomizationRepository } from './repositories/product-customization.repository';
import { StyleOptionRepository } from './repositories/style-option.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateProductCustomizationDto } from './dto/create-product-customization.dto';
import { UpdateProductCustomizationDto } from './dto/update-product-customization.dto';
import { ProductCustomizationListQueryDto } from './dto/product-customization-list-query.dto';
import { ProductCustomizationResponseDto } from './dto/product-customization-response.dto';
import { CreatePricingAdjustmentDto } from './dto/create-pricing-adjustment.dto';
import { toProductCustomizationResponseDto } from './mappers/product-customization.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PricingAdjustmentType } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning. No `remove()` — this milestone's own "Controllers"
// section lists Create/Update/Get/List only for Product Customization,
// no Delete.
//
// Also injects ProductRepository (from CatalogModule) and
// StyleOptionRepository (this same module) for two of this milestone's
// own "Business Rules":
// - a `productId` must genuinely belong to the caller's tenant before a
//   customization can be created for it (same pattern as
//   FabricService.assertProductsBelongToTenant());
// - "Style options belong to the selected product" — any `styleOptionId`
//   on a pricing adjustment (only meaningful at UPDATE time — see
//   create-pricing-adjustment.dto.ts's own comment) must resolve to a
//   style option whose group belongs to THIS SAME ProductCustomization.
@Injectable()
export class ProductCustomizationService {
  constructor(
    private readonly productCustomizationRepository: ProductCustomizationRepository,
    private readonly productRepository: ProductRepository,
    private readonly styleOptionRepository: StyleOptionRepository,
  ) {}

  async create(
    dto: CreateProductCustomizationDto,
    tenantId: string,
  ): Promise<ProductCustomizationResponseDto> {
    const product = await this.productRepository.findActiveById(dto.productId, tenantId);
    if (!product) {
      throw new BadRequestException(`Product ${dto.productId} not found`);
    }

    // A nested `styleOptionId` on a pricing adjustment can only reference
    // a style option that already exists — nothing does yet, since this
    // request is what creates them (see create-pricing-adjustment.dto.ts's
    // own comment). Rejected outright, rather than silently ignored.
    for (const adjustment of dto.pricingAdjustments ?? []) {
      if (adjustment.styleOptionId) {
        throw new BadRequestException(
          'pricingAdjustments[].styleOptionId cannot be set at creation — add it via PATCH once the referenced style option exists',
        );
      }
    }

    try {
      const customization = await this.productCustomizationRepository.createWithRelations({
        tenantId,
        productId: dto.productId,
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
        styleOptionGroups: dto.styleOptionGroups
          ? {
              create: dto.styleOptionGroups.map((group, groupIndex) => ({
                tenantId,
                name: group.name,
                description: group.description,
                isRequired: group.isRequired ?? true,
                sortOrder: group.sortOrder ?? groupIndex,
                styleOptions: group.styleOptions
                  ? {
                      create: group.styleOptions.map((option, optionIndex) => ({
                        tenantId,
                        name: option.name,
                        description: option.description,
                        priceAdjustment: option.priceAdjustment ?? '0',
                        status: option.status,
                        sortOrder: option.sortOrder ?? optionIndex,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
        pricingAdjustments: dto.pricingAdjustments
          ? {
              create: dto.pricingAdjustments.map((a) =>
                this.toPricingAdjustmentCreateData(a, tenantId),
              ),
            }
          : undefined,
        monogramOptions: dto.monogramOptions
          ? {
              create: dto.monogramOptions.map((m) => ({
                tenantId,
                label: m.label,
                maxCharacters: m.maxCharacters ?? 3,
                allowedCharacters: m.allowedCharacters,
                priceAdjustment: m.priceAdjustment ?? '0',
                isActive: m.isActive ?? true,
              })),
            }
          : undefined,
      });
      return toProductCustomizationResponseDto(customization);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`Product ${dto.productId} already has a customization`);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<ProductCustomizationResponseDto> {
    const customization = await this.productCustomizationRepository.findActiveById(id, tenantId);
    if (!customization) {
      throw new NotFoundException(`Product customization ${id} not found`);
    }
    return toProductCustomizationResponseDto(customization);
  }

  async list(
    query: ProductCustomizationListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<ProductCustomizationResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.ProductCustomizationWhereInput = {
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.productCustomizationRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toProductCustomizationResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(
    id: string,
    dto: UpdateProductCustomizationDto,
    tenantId: string,
  ): Promise<ProductCustomizationResponseDto> {
    const existing = await this.productCustomizationRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Product customization ${id} not found`);
    }

    for (const adjustment of dto.pricingAdjustments ?? []) {
      if (adjustment.styleOptionId) {
        await this.assertStyleOptionBelongsToCustomization(adjustment.styleOptionId, id, tenantId);
      }
    }

    await this.productCustomizationRepository.updateWithRelations(id, {
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive,
    });

    if (dto.pricingAdjustments) {
      await this.productCustomizationRepository.replacePricingAdjustments(
        tenantId,
        id,
        dto.pricingAdjustments.map((a) => this.toPricingAdjustmentCreateData(a, tenantId)),
      );
    }

    if (dto.monogramOptions) {
      await this.productCustomizationRepository.replaceMonogramOptions(
        tenantId,
        id,
        dto.monogramOptions.map((m) => ({
          tenantId,
          label: m.label,
          maxCharacters: m.maxCharacters ?? 3,
          allowedCharacters: m.allowedCharacters,
          priceAdjustment: m.priceAdjustment ?? '0',
          isActive: m.isActive ?? true,
        })),
      );
    }

    const updated = await this.productCustomizationRepository.findActiveById(id, tenantId);
    return toProductCustomizationResponseDto(updated!);
  }

  private toPricingAdjustmentCreateData(
    adjustment: CreatePricingAdjustmentDto,
    tenantId: string,
  ): Omit<Prisma.PricingAdjustmentCreateManyInput, 'productCustomizationId'> {
    return {
      tenantId,
      styleOptionId: adjustment.styleOptionId,
      label: adjustment.label,
      adjustmentType: adjustment.adjustmentType ?? PricingAdjustmentType.FLAT,
      amount: adjustment.amount,
      isActive: adjustment.isActive ?? true,
    };
  }

  private async assertStyleOptionBelongsToCustomization(
    styleOptionId: string,
    productCustomizationId: string,
    tenantId: string,
  ): Promise<void> {
    const styleOption = await this.styleOptionRepository.findActiveById(styleOptionId, tenantId);
    if (!styleOption) {
      throw new BadRequestException(`Style option ${styleOptionId} not found`);
    }
    const group = await this.styleOptionRepository.findGroupById(
      styleOption.styleOptionGroupId,
      tenantId,
    );
    if (!group || group.productCustomizationId !== productCustomizationId) {
      throw new BadRequestException(
        `Style option ${styleOptionId} does not belong to this product's customization`,
      );
    }
  }
}
