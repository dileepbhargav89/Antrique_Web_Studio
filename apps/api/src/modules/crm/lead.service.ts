import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeadRepository } from './repositories/lead.repository';
import { CustomerActivityRepository } from './repositories/customer-activity.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { ClientRepository } from './repositories/client.repository';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { ConvertLeadToClientDto } from './dto/convert-lead-to-client.dto';
import { ArchiveLeadDto } from './dto/archive-lead.dto';
import { LeadListQueryDto } from './dto/lead-list-query.dto';
import { LeadResponseDto } from './dto/lead-response.dto';
import { toLeadResponseDto } from './mappers/lead.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { LEAD_TERMINAL_STATUSES } from './constants/crm.constant';
import {
  ClientStatus,
  CustomerActivityType,
  CustomerStatus,
  LeadStatus,
} from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning.
//
// This milestone's own "Lead" business responsibilities:
// - "Create"/"Update" — standard, tenant-scoped, with "Prevent duplicate
//   active leads" run on both (see `assertNoDuplicateActiveLead()`).
// - "Convert Lead → Customer" — creates or links a real `Customer` (via
//   the SAME `CustomerRepository` Milestone 8's own `CustomerService`
//   uses, reused directly per this milestone's own "Use:
//   CustomerRepository" integration requirement, not duplicated) and
//   records a `LEAD_CONVERTED` `CustomerActivity`, all inside ONE
//   transaction — "Lead conversion creates CustomerActivity," this
//   milestone's own explicit rule.
// - "Convert Lead → Client" (Phase 7, Enterprise CRM/Project-Management)
//   — a second, unrelated conversion path for the agency-engagement
//   pipeline (Lead → Client → Project), as opposed to the one-off
//   e-commerce purchase path above. Always CREATES a new Client (never
//   finds-and-links) — see `convertToClient()`'s own comment for why.
// - "Archive" — a terminal status, distinct from Convert; "Archived
//   leads immutable" is enforced by `assertMutable()`, shared by
//   `update()`/`convert()`/`archive()` itself (an already-archived lead
//   can't be re-archived either).
@Injectable()
export class LeadService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly customerActivityRepository: CustomerActivityRepository,
    private readonly clientRepository: ClientRepository,
  ) {}

  async create(dto: CreateLeadDto, tenantId: string): Promise<LeadResponseDto> {
    if (!dto.source && !dto.leadSourceId) {
      throw new BadRequestException('Either source or leadSourceId must be provided');
    }
    await this.assertNoDuplicateActiveLead(dto.contactEmail, tenantId);
    const resolvedSource = await this.resolveSourceText(dto.source, dto.leadSourceId, tenantId);

    const lead = await this.leadRepository.runInTransaction(async (tx) => {
      const created = await this.leadRepository.createInTx(tx, {
        tenantId,
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        organization: dto.organization,
        source: resolvedSource,
        leadSourceId: dto.leadSourceId,
        serviceInterest: dto.serviceInterest ?? [],
        industry: dto.industry,
        assigneeId: dto.assigneeId,
        status: LeadStatus.NEW,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      });

      // "Automatic activity creation for: lead creation" — no Customer
      // exists yet, so this row is anchored by `relatedLeadId` alone
      // (see schema.prisma's own comment on CustomerActivity).
      await this.customerActivityRepository.createInTx(tx, {
        tenantId,
        type: CustomerActivityType.LEAD_CREATED,
        summary: `Lead created for ${created.contactEmail}`,
        relatedLeadId: created.id,
      });

      return created;
    });

    return toLeadResponseDto(lead);
  }

  async findById(id: string, tenantId: string): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findActiveById(id, tenantId);
    if (!lead) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    return toLeadResponseDto(lead);
  }

  async list(
    query: LeadListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<LeadResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.LeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.leadSourceId ? { leadSourceId: query.leadSourceId } : {}),
      ...(query.source ? { source: { contains: query.source, mode: 'insensitive' } } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { contactName: { contains: query.search, mode: 'insensitive' } },
              { contactEmail: { contains: query.search, mode: 'insensitive' } },
              { organization: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.leadRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toLeadResponseDto), total, page, limit);
  }

  async update(id: string, dto: UpdateLeadDto, tenantId: string): Promise<LeadResponseDto> {
    const existing = await this.leadRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    this.assertMutable(existing.status);
    if (dto.contactEmail && dto.contactEmail !== existing.contactEmail) {
      await this.assertNoDuplicateActiveLead(dto.contactEmail, tenantId, id);
    }
    const resolvedSource =
      dto.source || dto.leadSourceId
        ? await this.resolveSourceText(dto.source, dto.leadSourceId, tenantId)
        : undefined;

    const updated = await this.leadRepository.update({
      where: { id },
      data: {
        contactName: dto.contactName,
        contactEmail: dto.contactEmail,
        organization: dto.organization,
        source: resolvedSource,
        leadSourceId: dto.leadSourceId,
        serviceInterest: dto.serviceInterest,
        industry: dto.industry,
        assigneeId: dto.assigneeId,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    return toLeadResponseDto(updated);
  }

  // "Archive" — its own terminal status, distinct from Convert.
  async archive(id: string, dto: ArchiveLeadDto, tenantId: string): Promise<LeadResponseDto> {
    const existing = await this.leadRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    this.assertMutable(existing.status);

    const archived = await this.leadRepository.update({
      where: { id },
      data: {
        status: LeadStatus.ARCHIVED,
        metadata: dto.reason
          ? ({
              ...(existing.metadata as Record<string, unknown> | null),
              archiveReason: dto.reason,
            } as Prisma.InputJsonValue)
          : undefined,
      },
    });
    return toLeadResponseDto(archived);
  }

  // "Convert Lead → Customer" — creates or links a real Customer (via
  // CustomerRepository, reused not duplicated) and records
  // `LEAD_CONVERTED`, both in the same transaction as the Lead's own
  // status update.
  async convert(id: string, dto: ConvertLeadDto, tenantId: string): Promise<LeadResponseDto> {
    const existing = await this.leadRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    this.assertMutable(existing.status);

    const updated = await this.leadRepository.runInTransaction(async (tx) => {
      let customer = await this.customerRepository.findActiveByEmailInTx(
        tx,
        existing.contactEmail,
        tenantId,
      );
      if (!customer) {
        const [firstName, ...rest] = existing.contactName.trim().split(/\s+/);
        try {
          customer = await this.customerRepository.createWithRelationsInTx(tx, {
            tenantId,
            email: existing.contactEmail,
            firstName: firstName || undefined,
            lastName: rest.length ? rest.join(' ') : undefined,
            status: CustomerStatus.ACTIVE,
          });
        } catch (error) {
          if (isUniqueConstraintViolation(error)) {
            throw new ConflictException(
              `A customer with email "${existing.contactEmail}" already exists`,
            );
          }
          throw error;
        }
      }

      const result = await this.leadRepository.updateInTx(tx, id, {
        status: LeadStatus.CONVERTED,
        convertedCustomerId: customer.id,
      });

      await this.customerActivityRepository.createInTx(tx, {
        tenantId,
        customerId: customer.id,
        relatedLeadId: id,
        type: CustomerActivityType.LEAD_CONVERTED,
        summary: `Lead ${existing.contactEmail} converted to customer`,
        metadata: dto.note ? { note: dto.note } : undefined,
      });

      return result;
    });

    return toLeadResponseDto(updated);
  }

  // "Convert Lead -> Client" — the agency-pipeline counterpart to
  // convert() (which creates a Customer, the unrelated e-commerce
  // lifecycle — see this file's header comment). Always creates a NEW
  // Client (never finds-and-links an existing one): unlike Customer,
  // Client has no unique constraint to back a race-safe find-or-create
  // (confirmed via schema.prisma — no `@@unique` on name/email), so
  // attempting one here would fabricate a guarantee the schema doesn't
  // provide. `Client.name` is required; resolved from the request body
  // first, falling back to the lead's own `organization` — a lead with
  // neither set can't be converted to a Client without the caller
  // supplying one.
  async convertToClient(
    id: string,
    dto: ConvertLeadToClientDto,
    tenantId: string,
  ): Promise<LeadResponseDto> {
    const existing = await this.leadRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Lead ${id} not found`);
    }
    this.assertMutable(existing.status);

    const clientName = dto.name ?? existing.organization;
    if (!clientName) {
      throw new BadRequestException(
        'Client name is required — this lead has no organization set, so one must be provided in the request body',
      );
    }

    const updated = await this.leadRepository.runInTransaction(async (tx) => {
      const client = await this.clientRepository.createInTx(tx, {
        tenantId,
        name: clientName,
        primaryEmail: dto.primaryEmail ?? existing.contactEmail,
        primaryPhone: dto.primaryPhone,
        website: dto.website,
        industry: existing.industry,
        status: ClientStatus.ACTIVE,
      });

      const result = await this.leadRepository.updateInTx(tx, id, {
        status: LeadStatus.CONVERTED,
        convertedClientId: client.id,
      });

      await this.customerActivityRepository.createInTx(tx, {
        tenantId,
        relatedLeadId: id,
        type: CustomerActivityType.LEAD_CONVERTED,
        summary: `Lead ${existing.contactEmail} converted to client "${clientName}"`,
        metadata: dto.note ? { note: dto.note } : undefined,
      });

      return result;
    });

    return toLeadResponseDto(updated);
  }

  private assertMutable(status: LeadStatus): void {
    if ((LEAD_TERMINAL_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(
        `Lead cannot be modified from status ${status} — archived/converted leads are immutable`,
      );
    }
  }

  private async assertNoDuplicateActiveLead(
    email: string,
    tenantId: string,
    excludeLeadId?: string,
  ): Promise<void> {
    const existing = await this.leadRepository.findActiveByEmail(email, tenantId, excludeLeadId);
    if (existing) {
      throw new ConflictException(`An active lead for ${email} already exists`);
    }
  }

  // Resolves the legacy NOT NULL `source` string column from whichever
  // of `source`/`leadSourceId` the caller gave — see create-lead.dto.ts's
  // own comment.
  private async resolveSourceText(
    source: string | undefined,
    leadSourceId: string | undefined,
    tenantId: string,
  ): Promise<string> {
    if (leadSourceId) {
      const leadSource = await this.leadRepository.findActiveLeadSourceById(leadSourceId, tenantId);
      if (!leadSource) {
        throw new BadRequestException(`Lead source ${leadSourceId} not found`);
      }
      return leadSource.name;
    }
    return source!;
  }
}
