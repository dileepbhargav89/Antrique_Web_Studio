import { Injectable, NotFoundException } from '@nestjs/common';
import { TaxRepository } from './repositories/tax.repository';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { TaxRateListQueryDto } from './dto/tax-rate-list-query.dto';
import { TaxRateResponseDto } from './dto/tax-rate-response.dto';
import { toTaxRateResponseDto } from './mappers/tax-rate.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma } from '../../../generated/prisma/client';

// Business logic + repository orchestration + mapping. This milestone's
// own "Tax" business responsibilities:
// - "Validate tax rules" — a rate must be within [0, 100]; the
//   database's own `tax_rates_rate_check` CHECK constraint is the real
//   backstop, this service's `IsNumberString` DTO validation is the
//   fast-fail layer.
// - "Support multiple tax rates" — satisfied structurally: TaxRate is a
//   full CRUD-able tenant-scoped table, any number of rows.
// - "Calculate totals" — `calculateTax()`, reused by InvoiceService
//   (not duplicated) for "Tax calculated server-side."
@Injectable()
export class TaxService {
  constructor(private readonly taxRepository: TaxRepository) {}

  async create(dto: CreateTaxRateDto, tenantId: string): Promise<TaxRateResponseDto> {
    const taxRate = await this.taxRepository.create({
      data: {
        tenantId,
        name: dto.name,
        rate: new Prisma.Decimal(dto.rate),
        isActive: dto.isActive ?? true,
      },
    });
    return toTaxRateResponseDto(taxRate);
  }

  async findById(id: string, tenantId: string): Promise<TaxRateResponseDto> {
    const taxRate = await this.taxRepository.findActiveById(id, tenantId);
    if (!taxRate) {
      throw new NotFoundException(`Tax rate ${id} not found`);
    }
    return toTaxRateResponseDto(taxRate);
  }

  async list(
    query: TaxRateListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<TaxRateResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.TaxRateWhereInput = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.taxRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toTaxRateResponseDto), total, page, limit);
  }

  async update(id: string, dto: UpdateTaxRateDto, tenantId: string): Promise<TaxRateResponseDto> {
    const existing = await this.taxRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Tax rate ${id} not found`);
    }
    const updated = await this.taxRepository.update({
      where: { id },
      data: {
        name: dto.name,
        rate: dto.rate !== undefined ? new Prisma.Decimal(dto.rate) : undefined,
        isActive: dto.isActive,
      },
    });
    return toTaxRateResponseDto(updated);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.taxRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Tax rate ${id} not found`);
    }
    await this.taxRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // "Calculate totals" — reused by InvoiceService, never duplicated.
  // Rounded to 2 decimal places (money precision, matching every other
  // monetary column's own `Decimal(12, 2)` scale).
  calculateTax(subtotal: Prisma.Decimal, taxRate: { rate: Prisma.Decimal }): Prisma.Decimal {
    return subtotal.mul(taxRate.rate).div(100).toDecimalPlaces(2);
  }
}
