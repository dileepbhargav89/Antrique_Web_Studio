import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StyleOptionRepository } from './repositories/style-option.repository';
import { CreateStyleOptionDto } from './dto/create-style-option.dto';
import { UpdateStyleOptionDto } from './dto/update-style-option.dto';
import { StyleOptionListQueryDto } from './dto/style-option-list-query.dto';
import { StyleOptionResponseDto } from './dto/style-option-response.dto';
import { toStyleOptionResponseDto } from './mappers/style-option.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { StyleOptionStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning.
//
// Two of this milestone's own "Business Rules" live here:
// - "Style options belong to the selected product" —
//   assertGroupBelongsToTenant() validates `styleOptionGroupId`, and
//   assertIncompatibleOptionsBelongToSameProduct() validates every
//   `incompatibleStyleOptionIds` entry resolves to a style option in the
//   SAME product's customization as the one being created/updated — a
//   cross-product "incompatibility" would be meaningless (a customer
//   only ever configures one product's customization at a time).
// - "Incompatible style combinations are rejected" — modeled as
//   admin-configured metadata (see schema.prisma's own comment on
//   StyleOptionIncompatibility): a self-reference or a cross-product
//   reference is rejected outright at write time.
@Injectable()
export class StyleOptionService {
  constructor(private readonly styleOptionRepository: StyleOptionRepository) {}

  async create(dto: CreateStyleOptionDto, tenantId: string): Promise<StyleOptionResponseDto> {
    const group = await this.assertGroupBelongsToTenant(dto.styleOptionGroupId, tenantId);
    await this.assertIncompatibleOptionsBelongToSameProduct(
      dto.incompatibleStyleOptionIds,
      group.productCustomizationId,
      tenantId,
    );

    try {
      const styleOption = await this.styleOptionRepository.create({
        data: {
          tenantId,
          styleOptionGroupId: dto.styleOptionGroupId,
          name: dto.name,
          description: dto.description,
          priceAdjustment: dto.priceAdjustment ?? '0',
          status: dto.status ?? StyleOptionStatus.ACTIVE,
          sortOrder: dto.sortOrder ?? 0,
        },
      });

      if (dto.incompatibleStyleOptionIds) {
        await this.styleOptionRepository.setIncompatibilities(
          tenantId,
          styleOption.id,
          dto.incompatibleStyleOptionIds,
        );
      }

      const incompatibilities = await this.styleOptionRepository.findIncompatibilities(
        tenantId,
        styleOption.id,
      );
      return toStyleOptionResponseDto(styleOption, incompatibilities);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('A style option with this data already exists');
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<StyleOptionResponseDto> {
    const styleOption = await this.styleOptionRepository.findActiveById(id, tenantId);
    if (!styleOption) {
      throw new NotFoundException(`Style option ${id} not found`);
    }
    const incompatibilities = await this.styleOptionRepository.findIncompatibilities(tenantId, id);
    return toStyleOptionResponseDto(styleOption, incompatibilities);
  }

  async list(
    query: StyleOptionListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<StyleOptionResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.StyleOptionWhereInput = {
      ...(query.styleOptionGroupId ? { styleOptionGroupId: query.styleOptionGroupId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.productId
        ? {
            styleOptionGroup: {
              productCustomization: { productId: query.productId },
            },
          }
        : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    // List rows omit `incompatibleStyleOptionIds` (each would need its own
    // findIncompatibilities() round-trip) — the same "list is a lighter
    // summary than detail" convention catalog's own ProductResponseDto
    // established for variants/images. GET /style-options/:id (findById
    // above) always includes it.

    const { items, total } = await this.styleOptionRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toStyleOptionResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(
    id: string,
    dto: UpdateStyleOptionDto,
    tenantId: string,
  ): Promise<StyleOptionResponseDto> {
    const existing = await this.styleOptionRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Style option ${id} not found`);
    }

    const groupId = dto.styleOptionGroupId ?? existing.styleOptionGroupId;
    const group = await this.assertGroupBelongsToTenant(groupId, tenantId);
    await this.assertIncompatibleOptionsBelongToSameProduct(
      dto.incompatibleStyleOptionIds,
      group.productCustomizationId,
      tenantId,
      id,
    );

    const updated = await this.styleOptionRepository.update({
      where: { id },
      data: {
        styleOptionGroupId: dto.styleOptionGroupId,
        name: dto.name,
        description: dto.description,
        priceAdjustment: dto.priceAdjustment,
        status: dto.status,
        sortOrder: dto.sortOrder,
      },
    });

    if (dto.incompatibleStyleOptionIds) {
      await this.styleOptionRepository.setIncompatibilities(
        tenantId,
        id,
        dto.incompatibleStyleOptionIds,
      );
    }

    const incompatibilities = await this.styleOptionRepository.findIncompatibilities(tenantId, id);
    return toStyleOptionResponseDto(updated, incompatibilities);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.styleOptionRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Style option ${id} not found`);
    }

    await this.styleOptionRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertGroupBelongsToTenant(groupId: string, tenantId: string) {
    const group = await this.styleOptionRepository.findGroupById(groupId, tenantId);
    if (!group) {
      throw new BadRequestException(`Style option group ${groupId} not found`);
    }
    return group;
  }

  private async assertIncompatibleOptionsBelongToSameProduct(
    incompatibleStyleOptionIds: string[] | undefined,
    productCustomizationId: string,
    tenantId: string,
    selfId?: string,
  ): Promise<void> {
    if (!incompatibleStyleOptionIds?.length) {
      return;
    }
    for (const otherId of incompatibleStyleOptionIds) {
      if (otherId === selfId) {
        throw new BadRequestException('A style option cannot be incompatible with itself');
      }
      const other = await this.styleOptionRepository.findActiveById(otherId, tenantId);
      if (!other) {
        throw new BadRequestException(`Style option ${otherId} not found`);
      }
      const otherGroup = await this.styleOptionRepository.findGroupById(
        other.styleOptionGroupId,
        tenantId,
      );
      if (!otherGroup || otherGroup.productCustomizationId !== productCustomizationId) {
        throw new BadRequestException(
          `Style option ${otherId} does not belong to the same product's customization`,
        );
      }
    }
  }
}
