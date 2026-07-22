import { BadRequestException, Injectable } from '@nestjs/common';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CustomerActivityListQueryDto } from './dto/customer-activity-list-query.dto';
import { CustomerActivityTimelineQueryDto } from './dto/customer-activity-timeline-query.dto';
import { CustomerActivityResponseDto } from './dto/customer-activity-response.dto';
import { toCustomerActivityResponseDto } from './mappers/customer-activity.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma } from '../../../generated/prisma/client';

// Read-only service — this milestone's own "Activities" Controllers list
// is "Timeline, List" only. Every row is written internally by
// LeadService/FollowUpService (see CustomerActivityRepository's own
// header comment); nothing here ever calls `create()`.
@Injectable()
export class CustomerActivityService {
  constructor(
    private readonly customerActivityRepository: CustomerActivityRepository,
    private readonly customerRepository: CustomerRepository,
  ) {}

  // "Timeline creation" — the full, ordered feed for one customer.
  async timeline(
    query: CustomerActivityTimelineQueryDto,
    tenantId: string,
  ): Promise<CustomerActivityResponseDto[]> {
    const customer = await this.customerRepository.findActiveById(query.customerId, tenantId);
    if (!customer) {
      throw new BadRequestException(`Customer ${query.customerId} not found`);
    }
    const activities = await this.customerActivityRepository.findTimelineForCustomer(
      query.customerId,
      tenantId,
    );
    return activities.map(toCustomerActivityResponseDto);
  }

  async list(
    query: CustomerActivityListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<CustomerActivityResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.CustomerActivityWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.leadId ? { relatedLeadId: query.leadId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const { items, total } = await this.customerActivityRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toCustomerActivityResponseDto), total, page, limit);
  }
}
