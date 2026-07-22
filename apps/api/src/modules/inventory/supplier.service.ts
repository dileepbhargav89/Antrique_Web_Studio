import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupplierRepository } from './repositories/supplier.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierListQueryDto } from './dto/supplier-list-query.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { toSupplierResponseDto } from './mappers/supplier.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { SupplierStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning.
//
// `assertSupplierProductReferencesBelongToTenant()` validates every
// nested `products[]` entry's `productVariantId`/`fabricId` (whichever
// is set) belongs to the caller's tenant before letting a
// SupplierProduct reference it — the same cross-entity tenant-ownership
// pattern ProductService/FabricService/InventoryService all already
// establish for their own foreign references.
@Injectable()
export class SupplierService {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async create(dto: CreateSupplierDto, tenantId: string): Promise<SupplierResponseDto> {
    this.assertProductsValid(dto.products);
    await this.assertSupplierProductReferencesBelongToTenant(dto.products, tenantId);

    try {
      const supplier = await this.supplierRepository.createWithRelations({
        tenantId,
        name: dto.name,
        slug: dto.slug,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        status: dto.status ?? SupplierStatus.ACTIVE,
        notes: dto.notes,
        supplierProducts: dto.products
          ? {
              create: dto.products.map((p) => ({
                tenantId,
                productVariantId: p.productVariantId,
                fabricId: p.fabricId,
                supplierSku: p.supplierSku,
                cost: p.cost,
                leadTimeDays: p.leadTimeDays,
              })),
            }
          : undefined,
      });
      return toSupplierResponseDto(supplier, supplier.supplierProducts);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A supplier with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<SupplierResponseDto> {
    const supplier = await this.supplierRepository.findActiveById(id, tenantId);
    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }
    return toSupplierResponseDto(supplier, supplier.supplierProducts);
  }

  async list(
    query: SupplierListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<SupplierResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.SupplierWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.supplierRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toSupplierResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(id: string, dto: UpdateSupplierDto, tenantId: string): Promise<SupplierResponseDto> {
    const existing = await this.supplierRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }
    this.assertProductsValid(dto.products);
    await this.assertSupplierProductReferencesBelongToTenant(dto.products, tenantId);

    try {
      const updated = await this.supplierRepository.updateWithRelations(id, {
        name: dto.name,
        slug: dto.slug,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        status: dto.status,
        notes: dto.notes,
      });

      if (dto.products) {
        await this.supplierRepository.replaceSupplierProducts(
          tenantId,
          id,
          dto.products.map((p) => ({
            productVariantId: p.productVariantId,
            fabricId: p.fabricId,
            supplierSku: p.supplierSku,
            cost: p.cost,
            leadTimeDays: p.leadTimeDays,
          })),
        );
        const fresh = await this.supplierRepository.findActiveById(id, tenantId);
        return toSupplierResponseDto(fresh!, fresh!.supplierProducts);
      }

      return toSupplierResponseDto(updated, updated.supplierProducts);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A supplier with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.supplierRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    await this.supplierRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private assertProductsValid(products: CreateSupplierProductDto[] | undefined): void {
    for (const p of products ?? []) {
      if (Boolean(p.productVariantId) === Boolean(p.fabricId)) {
        throw new BadRequestException(
          'Each supplier product must reference exactly one of productVariantId or fabricId',
        );
      }
    }
  }

  // Milestone 12 (Performance Engineering) — each item's own existence
  // check is fully independent of every other item's (a different
  // productVariantId/fabricId, no shared state), so `Promise.all()` runs
  // them concurrently instead of one round trip at a time — the same
  // business rules, the same exception on the same invalid entry, just
  // without waiting for N sequential round trips when N-way concurrency
  // is safe. `Promise.all()` rejects with whichever check's own
  // exception settles first if more than one entry is invalid
  // simultaneously (previously always the FIRST invalid entry in array
  // order) — an accepted, reviewed behavioral nuance: the request still
  // fails with a clear `BadRequestException` either way, just not always
  // naming the same one of several already-invalid entries.
  private async assertSupplierProductReferencesBelongToTenant(
    products: CreateSupplierProductDto[] | undefined,
    tenantId: string,
  ): Promise<void> {
    await Promise.all(
      (products ?? []).map(async (p) => {
        if (p.productVariantId) {
          const exists = await this.supplierRepository.productVariantExistsForTenant(
            p.productVariantId,
            tenantId,
          );
          if (!exists) {
            throw new BadRequestException(`Product variant ${p.productVariantId} not found`);
          }
        }
        if (p.fabricId) {
          const exists = await this.supplierRepository.fabricExistsForTenant(p.fabricId, tenantId);
          if (!exists) {
            throw new BadRequestException(`Fabric ${p.fabricId} not found`);
          }
        }
      }),
    );
  }
}
