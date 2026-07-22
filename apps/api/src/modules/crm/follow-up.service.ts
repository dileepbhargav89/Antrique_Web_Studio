import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FollowUpRepository } from './repositories/follow-up.repository';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { LeadRepository } from './repositories/lead.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto';
import { CancelFollowUpDto } from './dto/cancel-follow-up.dto';
import { FollowUpListQueryDto } from './dto/follow-up-list-query.dto';
import { FollowUpResponseDto } from './dto/follow-up-response.dto';
import { toFollowUpResponseDto } from './mappers/follow-up.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { CustomerActivityType, FollowUpStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

// Business logic + repository orchestration + mapping.
//
// This milestone's own "Follow-ups" business responsibilities:
// - "Create" — exactly one of `leadId`/`customerId` (the database's own
//   `follow_up_tasks_lead_xor_customer_check` is the backstop), "Due-date
//   validation" (rejects a `dueAt` in the past).
// - "Complete" — the one status change that also triggers "Automatic
//   activity creation for... follow-up completion" (this milestone's own
//   explicit rule), written in the same transaction.
// - "Reopen" — the one path back to PENDING from either terminal state.
// - "Cancel" — the other terminal state, no activity triggered (only
//   completion is a named automatic-activity trigger).
// - "Completed follow-ups cannot be edited" — `assertEditable()`, used by
//   `update()` only (complete/cancel/reopen are themselves the sanctioned
//   ways to change a completed/cancelled task's state).
@Injectable()
export class FollowUpService {
  constructor(
    private readonly followUpRepository: FollowUpRepository,
    private readonly customerActivityRepository: CustomerActivityRepository,
    private readonly leadRepository: LeadRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async create(dto: CreateFollowUpDto, tenantId: string): Promise<FollowUpResponseDto> {
    if ((dto.leadId && dto.customerId) || (!dto.leadId && !dto.customerId)) {
      throw new BadRequestException('Exactly one of leadId or customerId must be provided');
    }
    if (dto.leadId) {
      await this.assertLeadBelongsToTenant(dto.leadId, tenantId);
    }
    if (dto.customerId) {
      await this.assertCustomerBelongsToTenant(dto.customerId, tenantId);
    }
    this.assertDueDateNotInPast(dto.dueAt);

    const task = await this.followUpRepository.create({
      data: {
        tenantId,
        leadId: dto.leadId,
        customerId: dto.customerId,
        title: dto.title,
        description: dto.description,
        dueAt: new Date(dto.dueAt),
        assigneeId: dto.assigneeId,
        status: FollowUpStatus.PENDING,
      },
    });
    return toFollowUpResponseDto(task);
  }

  async findById(id: string, tenantId: string): Promise<FollowUpResponseDto> {
    const task = await this.followUpRepository.findActiveById(id, tenantId);
    if (!task) {
      throw new NotFoundException(`Follow-up ${id} not found`);
    }
    return toFollowUpResponseDto(task);
  }

  async list(
    query: FollowUpListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<FollowUpResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'dueAt';
    const sortDirection = query.sortDirection ?? 'asc';

    const where: Prisma.FollowUpTaskWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            dueAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.followUpRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toFollowUpResponseDto), total, page, limit);
  }

  async update(id: string, dto: UpdateFollowUpDto, tenantId: string): Promise<FollowUpResponseDto> {
    const existing = await this.followUpRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Follow-up ${id} not found`);
    }
    this.assertEditable(existing.status);
    if (dto.dueAt) {
      this.assertDueDateNotInPast(dto.dueAt);
    }

    const updated = await this.followUpRepository.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        assigneeId: dto.assigneeId,
      },
    });
    return toFollowUpResponseDto(updated);
  }

  // "Complete" — triggers "Automatic activity creation for... follow-up
  // completion," written in the same transaction as the status change.
  async complete(
    id: string,
    dto: CompleteFollowUpDto,
    tenantId: string,
  ): Promise<FollowUpResponseDto> {
    const existing = await this.followUpRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Follow-up ${id} not found`);
    }
    if (existing.status !== FollowUpStatus.PENDING) {
      throw new BadRequestException(
        `Follow-up ${id} cannot be completed from status ${existing.status}`,
      );
    }

    const updated = await this.followUpRepository.runInTransaction(async (tx) => {
      const result = await this.followUpRepository.updateInTx(tx, id, {
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date(),
      });
      await this.customerActivityRepository.createInTx(tx, {
        tenantId,
        customerId: existing.customerId,
        relatedLeadId: existing.leadId,
        type: CustomerActivityType.FOLLOW_UP_COMPLETED,
        summary: `Follow-up "${existing.title}" completed`,
        metadata: dto.note ? { note: dto.note } : undefined,
      });
      return result;
    });

    return toFollowUpResponseDto(updated);
  }

  // "Cancel" — the other terminal state. `dto.reason` isn't persisted
  // (`FollowUpTask` has no metadata column the way `Lead` does) — accepted
  // for symmetry with `CancelOrderDto`'s own shape, but there's nowhere
  // to store it this milestone.
  async cancel(
    id: string,
    _dto: CancelFollowUpDto,
    tenantId: string,
  ): Promise<FollowUpResponseDto> {
    const existing = await this.followUpRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Follow-up ${id} not found`);
    }
    if (existing.status !== FollowUpStatus.PENDING) {
      throw new BadRequestException(
        `Follow-up ${id} cannot be cancelled from status ${existing.status}`,
      );
    }

    const updated = await this.followUpRepository.update({
      where: { id },
      data: { status: FollowUpStatus.CANCELLED },
    });
    return toFollowUpResponseDto(updated);
  }

  // "Reopen" — the one path back to PENDING from either terminal state.
  async reopen(id: string, tenantId: string): Promise<FollowUpResponseDto> {
    const existing = await this.followUpRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Follow-up ${id} not found`);
    }
    if (existing.status === FollowUpStatus.PENDING) {
      throw new BadRequestException(`Follow-up ${id} is already pending`);
    }

    const updated = await this.followUpRepository.update({
      where: { id },
      data: { status: FollowUpStatus.PENDING, completedAt: null },
    });
    return toFollowUpResponseDto(updated);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.followUpRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Follow-up ${id} not found`);
    }
    await this.followUpRepository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private assertEditable(status: FollowUpStatus): void {
    if (status !== FollowUpStatus.PENDING) {
      throw new BadRequestException(
        `Completed/cancelled follow-ups cannot be edited (current status: ${status})`,
      );
    }
  }

  private assertDueDateNotInPast(dueAt: string): void {
    if (new Date(dueAt).getTime() < Date.now()) {
      throw new BadRequestException('dueAt must not be in the past');
    }
  }

  private async assertLeadBelongsToTenant(leadId: string, tenantId: string): Promise<void> {
    const lead = await this.leadRepository.findActiveById(leadId, tenantId);
    if (!lead) {
      throw new BadRequestException(`Lead ${leadId} not found`);
    }
  }

  private async assertCustomerBelongsToTenant(customerId: string, tenantId: string): Promise<void> {
    const customer = await this.customerRepository.findActiveById(customerId, tenantId);
    if (!customer) {
      throw new BadRequestException(`Customer ${customerId} not found`);
    }
  }
}
