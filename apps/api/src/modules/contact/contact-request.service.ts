import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ContactRequestRepository } from './repositories/contact-request.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { CustomerActivityRepository } from '../crm/repositories/customer-activity.repository';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { ContactRequestListQueryDto } from './dto/contact-request-list-query.dto';
import { ConvertContactRequestDto } from './dto/convert-contact-request.dto';
import { ContactRequestResponseDto } from './dto/contact-request-response.dto';
import { toContactRequestResponseDto } from './mappers/contact-request.mapper';
import { CONTACT_REQUEST_SOURCE } from './constants/contact.constant';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { JobRunner } from '../../jobs';
import { SendEmailJob } from '../../email';
import { LOGGER, Logger } from '../../logging';
import { escapeHtml } from '../../utils/html.util';
import {
  ContactRequestStatus,
  CustomerActivityType,
  LeadStatus,
  Prisma,
} from '../../../generated/prisma/client';

// Business logic + fire-and-forget confirmation email, plus the
// list/get/convert-to-lead triage flow (previously the module's own
// documented "not built" gap — see modules/contact/README.md). `createdBy`/
// `updatedBy` stay unset on `create()` for the same reason
// category.service.ts's own header comment documents (no user identifier
// exists in the request pipeline for a route that isn't even authenticated
// there) — `convert()` runs behind auth, so its own Lead row gets a real
// `createdBy` from the caller.
@Injectable()
export class ContactRequestService {
  constructor(
    private readonly contactRequestRepository: ContactRequestRepository,
    private readonly leadRepository: LeadRepository,
    private readonly customerActivityRepository: CustomerActivityRepository,
    private readonly jobRunner: JobRunner,
    private readonly sendEmailJob: SendEmailJob,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async create(dto: CreateContactRequestDto, tenantId: string): Promise<ContactRequestResponseDto> {
    const contactRequest = await this.contactRequestRepository.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        company: dto.company,
        message: dto.message,
        source: dto.source ?? CONTACT_REQUEST_SOURCE,
      },
    });

    // Fire-and-forget — never awaited in the request path (see
    // email/README.md's own comment on SendEmailJob): a slow or down
    // email provider must never delay or fail this response. JobRunner's
    // own run() doesn't reject on failure (it resolves 'dead_letter'
    // after exhausting retries), so the real failure signal is the
    // resolved result's status, not a caught rejection — the `.catch()`
    // below is defensive only, in case that internal contract ever
    // changes.
    void this.jobRunner
      .run(this.sendEmailJob, {
        to: contactRequest.email,
        subject: 'We received your message',
        html:
          `<p>Hi ${escapeHtml(contactRequest.name)},</p>` +
          '<p>Thanks for reaching out — we’ll get back to you within one business day.</p>',
      })
      .then((result) => {
        if (result.status === 'dead_letter') {
          this.logger.error('Contact request confirmation email exhausted retries', {
            contactRequestId: contactRequest.id,
            error: result.error,
          });
        }
      })
      .catch((error) => {
        this.logger.error('Contact request confirmation email job threw unexpectedly', {
          contactRequestId: contactRequest.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return toContactRequestResponseDto(contactRequest);
  }

  async findById(id: string, tenantId: string): Promise<ContactRequestResponseDto> {
    const contactRequest = await this.contactRequestRepository.findActiveById(id, tenantId);
    if (!contactRequest) {
      throw new NotFoundException(`Contact request ${id} not found`);
    }
    return toContactRequestResponseDto(contactRequest);
  }

  async list(
    query: ContactRequestListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<ContactRequestResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ContactRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { company: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.contactRequestRepository.findManyPaginated(
      tenantId,
      where,
      { createdAt: 'desc' },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toContactRequestResponseDto), total, page, limit);
  }

  // Converts a triaged ContactRequest into a real CRM Lead — the
  // "schema/relation to Lead already exists, unused" gap this module's
  // own README flagged. Mirrors LeadService.create()'s own duplicate-active-
  // lead guard and LEAD_CREATED activity logging exactly, so a Lead
  // created this way is indistinguishable from one created directly
  // through POST /leads. Terminal: an already-converted request can't be
  // converted again (its own status no longer NEW/CONTACTED).
  async convert(
    id: string,
    dto: ConvertContactRequestDto,
    tenantId: string,
  ): Promise<ContactRequestResponseDto> {
    const existing = await this.contactRequestRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Contact request ${id} not found`);
    }
    if (
      existing.status === ContactRequestStatus.CONVERTED ||
      existing.status === ContactRequestStatus.CLOSED ||
      existing.status === ContactRequestStatus.SPAM
    ) {
      throw new ConflictException(
        `Contact request cannot be converted from status ${existing.status}`,
      );
    }

    const duplicateLead = await this.leadRepository.findActiveByEmail(existing.email, tenantId);
    if (duplicateLead) {
      throw new ConflictException(`An active lead for ${existing.email} already exists`);
    }

    const updated = await this.contactRequestRepository.runInTransaction(async (tx) => {
      const lead = await this.leadRepository.createInTx(tx, {
        tenantId,
        contactName: existing.name,
        contactEmail: existing.email,
        organization: existing.company,
        source: existing.source ?? CONTACT_REQUEST_SOURCE,
        serviceInterest: dto.serviceInterest ?? [],
        status: LeadStatus.NEW,
      });

      await this.customerActivityRepository.createInTx(tx, {
        tenantId,
        type: CustomerActivityType.LEAD_CREATED,
        summary: `Lead created from contact request for ${lead.contactEmail}`,
        relatedLeadId: lead.id,
        metadata: dto.note ? { note: dto.note } : undefined,
      });

      return this.contactRequestRepository.updateInTx(tx, id, {
        status: ContactRequestStatus.CONVERTED,
        convertedLeadId: lead.id,
      });
    });

    return toContactRequestResponseDto(updated);
  }
}
