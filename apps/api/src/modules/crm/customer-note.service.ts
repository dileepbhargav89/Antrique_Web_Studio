import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerNoteRepository } from './repositories/customer-note.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { UpdateCustomerNoteDto } from './dto/update-customer-note.dto';
import { CustomerNoteListQueryDto } from './dto/customer-note-list-query.dto';
import { CustomerNoteResponseDto } from './dto/customer-note-response.dto';
import { toCustomerNoteResponseDto } from './mappers/customer-note.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma } from '../../../generated/prisma/client';

// Business logic + repository orchestration + mapping. "Notes never
// hard-delete" — `remove()` always sets `deletedAt`, never issues a real
// DELETE.
@Injectable()
export class CustomerNoteService {
  constructor(
    private readonly customerNoteRepository: CustomerNoteRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  // `authorUserId` is left unset here — same known, accepted gap as
  // `createdBy`/`updatedBy`/`deletedBy` everywhere else in this codebase
  // (`RequestUser` is `{ email }` only, no `userId` anywhere in the
  // request pipeline to populate it with — see
  // docs/implementation/decisions.md, Milestone 5's own original entry
  // on this).
  async create(dto: CreateCustomerNoteDto, tenantId: string): Promise<CustomerNoteResponseDto> {
    await this.assertCustomerBelongsToTenant(dto.customerId, tenantId);

    const note = await this.customerNoteRepository.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        body: dto.body,
      },
    });
    return toCustomerNoteResponseDto(note);
  }

  async findById(id: string, tenantId: string): Promise<CustomerNoteResponseDto> {
    const note = await this.customerNoteRepository.findActiveById(id, tenantId);
    if (!note) {
      throw new NotFoundException(`Customer note ${id} not found`);
    }
    return toCustomerNoteResponseDto(note);
  }

  async list(
    query: CustomerNoteListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<CustomerNoteResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.CustomerNoteWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search ? { body: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.customerNoteRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toCustomerNoteResponseDto), total, page, limit);
  }

  async update(
    id: string,
    dto: UpdateCustomerNoteDto,
    tenantId: string,
  ): Promise<CustomerNoteResponseDto> {
    const existing = await this.customerNoteRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Customer note ${id} not found`);
    }
    const updated = await this.customerNoteRepository.update({
      where: { id },
      data: { body: dto.body },
    });
    return toCustomerNoteResponseDto(updated);
  }

  // "Notes never hard-delete" — soft-delete only.
  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.customerNoteRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Customer note ${id} not found`);
    }
    await this.customerNoteRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertCustomerBelongsToTenant(customerId: string, tenantId: string): Promise<void> {
    const customer = await this.customerRepository.findActiveById(customerId, tenantId);
    if (!customer) {
      throw new BadRequestException(`Customer ${customerId} not found`);
    }
  }
}
