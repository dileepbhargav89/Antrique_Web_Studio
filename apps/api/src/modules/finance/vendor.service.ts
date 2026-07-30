import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { VendorRepository } from './repositories/vendor.repository';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { VendorListQueryDto } from './dto/vendor-list-query.dto';
import { VendorResponseDto } from './dto/vendor-response.dto';
import { toVendorResponseDto } from './mappers/vendor.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { VendorStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Phase 9, Module 1, Step 1 (Vendor Management) — business logic +
// repository orchestration + mapping, same shape ClientService/
// SupplierService already establish. No `remove()`/delete route — no
// `vendors:delete` permission is seeded; moving to INACTIVE/ARCHIVED
// happens through the same general-purpose `update()` every other field
// goes through, same as ClientService.
@Injectable()
export class VendorService {
  constructor(private readonly vendorRepository: VendorRepository) {}

  async create(dto: CreateVendorDto, tenantId: string): Promise<VendorResponseDto> {
    try {
      const vendor = await this.vendorRepository.create({
        data: {
          tenantId,
          name: dto.name,
          slug: dto.slug,
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          gstin: dto.gstin,
          paymentTerms: dto.paymentTerms,
          notes: dto.notes,
          status: VendorStatus.ACTIVE,
        },
      });
      return toVendorResponseDto(vendor);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A vendor with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async findById(id: string, tenantId: string): Promise<VendorResponseDto> {
    const vendor = await this.vendorRepository.findActiveById(id, tenantId);
    if (!vendor) {
      throw new NotFoundException(`Vendor ${id} not found`);
    }
    return toVendorResponseDto(vendor);
  }

  async list(
    query: VendorListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<VendorResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.VendorWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.vendorRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toVendorResponseDto), total, page, limit);
  }

  async update(id: string, dto: UpdateVendorDto, tenantId: string): Promise<VendorResponseDto> {
    const existing = await this.vendorRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Vendor ${id} not found`);
    }
    try {
      const updated = await this.vendorRepository.update({
        where: { id },
        data: {
          name: dto.name,
          slug: dto.slug,
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          gstin: dto.gstin,
          paymentTerms: dto.paymentTerms,
          notes: dto.notes,
          status: dto.status,
        },
      });
      return toVendorResponseDto(updated);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A vendor with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }
}
