import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerTagRepository } from './repositories/customer-tag.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateCustomerTagDto } from './dto/create-customer-tag.dto';
import { UpdateCustomerTagDto } from './dto/update-customer-tag.dto';
import { CustomerTagListQueryDto } from './dto/customer-tag-list-query.dto';
import { CustomerTagResponseDto } from './dto/customer-tag-response.dto';
import { toCustomerTagResponseDto } from './mappers/customer-tag.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// A 5th service beyond this milestone's own named "Service Layer" list —
// see CustomerTagRepository's own header comment and
// docs/implementation/decisions.md for why: makes `CustomerTag`/
// `CustomerTagAssignment` (this milestone's own named "Core entities")
// and the "Tags" list filter genuinely usable, not dead schema.
@Injectable()
export class CustomerTagService {
  constructor(
    private readonly customerTagRepository: CustomerTagRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async create(dto: CreateCustomerTagDto, tenantId: string): Promise<CustomerTagResponseDto> {
    try {
      const tag = await this.customerTagRepository.create({
        data: { tenantId, name: dto.name, slug: dto.slug, color: dto.color },
      });
      return toCustomerTagResponseDto(tag);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException(`A tag with slug "${dto.slug}" already exists`);
      }
      throw error;
    }
  }

  async list(
    query: CustomerTagListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<CustomerTagResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'name';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.CustomerTagWhereInput = {
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.customerTagRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toCustomerTagResponseDto), total, page, limit);
  }

  async update(
    id: string,
    dto: UpdateCustomerTagDto,
    tenantId: string,
  ): Promise<CustomerTagResponseDto> {
    const existing = await this.customerTagRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Customer tag ${id} not found`);
    }
    const updated = await this.customerTagRepository.update({
      where: { id },
      data: { name: dto.name, color: dto.color },
    });
    return toCustomerTagResponseDto(updated);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.customerTagRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Customer tag ${id} not found`);
    }
    await this.customerTagRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assign(tagId: string, customerId: string, tenantId: string): Promise<void> {
    const tag = await this.customerTagRepository.findActiveById(tagId, tenantId);
    if (!tag) {
      throw new NotFoundException(`Customer tag ${tagId} not found`);
    }
    const customer = await this.customerRepository.findActiveById(customerId, tenantId);
    if (!customer) {
      throw new BadRequestException(`Customer ${customerId} not found`);
    }
    try {
      await this.customerTagRepository.assign(tenantId, customerId, tagId);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return; // already assigned — assigning again is a no-op, not an error
      }
      throw error;
    }
  }

  async unassign(tagId: string, customerId: string, tenantId: string): Promise<void> {
    const removed = await this.customerTagRepository.unassign(tenantId, customerId, tagId);
    if (!removed) {
      throw new NotFoundException(`Tag ${tagId} is not assigned to customer ${customerId}`);
    }
  }
}
