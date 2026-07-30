import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QuotationRepository } from './repositories/quotation.repository';
import { LeadRepository } from './repositories/lead.repository';
import { ClientRepository } from './repositories/client.repository';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { RejectQuotationDto } from './dto/reject-quotation.dto';
import { QuotationListQueryDto } from './dto/quotation-list-query.dto';
import { QuotationResponseDto } from './dto/quotation-response.dto';
import { toQuotationResponseDto } from './mappers/quotation.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import {
  QUOTATION_EDITABLE_STATUSES,
  QUOTATION_NUMBER_GENERATION_MAX_ATTEMPTS,
  QUOTATION_NUMBER_PREFIX,
} from './constants/crm.constant';
import { QuotationStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';
import { DocumentPdfService } from '../../pdf';
import { StorageService } from '../../storage';
import { JobRunner } from '../../jobs';
import { SendEmailJob } from '../../email';
import { LOGGER, Logger } from '../../logging';
import { escapeHtml } from '../../utils/html.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning.
//
// This phase's own "Proposal Management" business responsibilities,
// mapped onto the EXISTING `Quotation` model (no separate Proposal model
// exists anywhere in the schema — confirmed via a schema-wide search;
// `Quotation`'s own doc comment — "Quote-wizard output" — already covers
// exactly this shape: leadId/clientId XOR, line items, DRAFT->SENT->
// ACCEPTED/REJECTED/EXPIRED->CONVERTED):
// - "Create" — validates the leadId/clientId XOR (schema-level CHECK
//   constraint backs this at the DB layer too — `quotations_lead_xor_client_check`),
//   computes each item's `amount` server-side (never trusted from the
//   client), `subtotalAmount` = sum of items, `totalAmount` = subtotal +
//   tax - discount. Generates `quotationNumber` via a bounded
//   retry-on-collision loop, same pattern InvoiceService.generateInvoiceNumber()
//   already established.
// - "PDF generation" / "Email proposal" — `send()` renders a PDF
//   (DocumentPdfService, new shared infra this phase), stores it
//   (StorageService, unchanged — already accepted an arbitrary buffer),
//   and fire-and-forgets an email (EmailService/JobRunner, unchanged —
//   same pattern Phase 7's contact-form confirmation email already
//   established) to whichever of the lead/client has a real email
//   address.
// - "Accept / Reject" — SENT -> ACCEPTED/REJECTED, both terminal.
// - Descoped, flagged honestly (see this phase's own report): proposal
//   "templates" (would need a new model), "revision history" (no
//   version-chain field exists on Quotation).
@Injectable()
export class QuotationService {
  constructor(
    private readonly quotationRepository: QuotationRepository,
    private readonly leadRepository: LeadRepository,
    private readonly clientRepository: ClientRepository,
    private readonly documentPdfService: DocumentPdfService,
    private readonly storageService: StorageService,
    private readonly jobRunner: JobRunner,
    private readonly sendEmailJob: SendEmailJob,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async create(dto: CreateQuotationDto, tenantId: string): Promise<QuotationResponseDto> {
    this.assertExactlyOneSubject(dto.leadId, dto.clientId);
    if (dto.leadId) {
      const lead = await this.leadRepository.findActiveById(dto.leadId, tenantId);
      if (!lead) {
        throw new BadRequestException(`Lead ${dto.leadId} not found`);
      }
    }
    if (dto.clientId) {
      const client = await this.clientRepository.findActiveById(dto.clientId, tenantId);
      if (!client) {
        throw new BadRequestException(`Client ${dto.clientId} not found`);
      }
    }

    const preparedItems: Prisma.QuotationItemUncheckedCreateWithoutQuotationInput[] = dto.items.map(
      (item, index) => ({
        tenantId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: new Prisma.Decimal(item.quantity).mul(item.unitPrice),
        sortOrder: index,
      }),
    );
    const subtotal = preparedItems.reduce(
      (sum, item) => sum.add(item.amount as Prisma.Decimal),
      new Prisma.Decimal(0),
    );
    const taxAmount = new Prisma.Decimal(dto.taxAmount ?? 0);
    const discountAmount = new Prisma.Decimal(dto.discountAmount ?? 0);
    const totalAmount = subtotal.add(taxAmount).sub(discountAmount);

    let lastError: unknown;
    for (let attempt = 0; attempt < QUOTATION_NUMBER_GENERATION_MAX_ATTEMPTS; attempt++) {
      const quotationNumber = await this.generateQuotationNumber(tenantId);
      try {
        const quotation = await this.quotationRepository.runInTransaction((tx) =>
          this.quotationRepository.createInTx(tx, {
            tenantId,
            leadId: dto.leadId,
            clientId: dto.clientId,
            quotationNumber,
            currency: dto.currency ?? 'INR',
            subtotalAmount: subtotal,
            taxAmount,
            discountAmount,
            totalAmount,
            status: QuotationStatus.DRAFT,
            validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
            notes: dto.notes,
            items: { create: preparedItems },
          }),
        );
        return toQuotationResponseDto(quotation, quotation.items);
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Could not generate a unique quotation number — please retry', {
      cause: lastError,
    });
  }

  async findById(id: string, tenantId: string): Promise<QuotationResponseDto> {
    const quotation = await this.quotationRepository.findActiveById(id, tenantId);
    if (!quotation) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    return toQuotationResponseDto(quotation, quotation.items);
  }

  async list(
    query: QuotationListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<QuotationResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.QuotationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.leadId ? { leadId: query.leadId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.search ? { quotationNumber: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.quotationRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toQuotationResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  async update(
    id: string,
    dto: UpdateQuotationDto,
    tenantId: string,
  ): Promise<QuotationResponseDto> {
    const existing = await this.quotationRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    this.assertEditable(existing.status);

    const taxAmount =
      dto.taxAmount !== undefined ? new Prisma.Decimal(dto.taxAmount) : existing.taxAmount;
    const discountAmount =
      dto.discountAmount !== undefined
        ? new Prisma.Decimal(dto.discountAmount)
        : existing.discountAmount;

    const quotation = await this.quotationRepository.runInTransaction(async (tx) => {
      let subtotal = existing.subtotalAmount;
      if (dto.items) {
        await this.quotationRepository.deleteItemsInTx(tx, id);
        const preparedItems: Prisma.QuotationItemUncheckedCreateWithoutQuotationInput[] =
          dto.items.map((item, index) => ({
            tenantId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: new Prisma.Decimal(item.quantity).mul(item.unitPrice),
            sortOrder: index,
          }));
        subtotal = preparedItems.reduce(
          (sum, item) => sum.add(item.amount as Prisma.Decimal),
          new Prisma.Decimal(0),
        );
        return this.quotationRepository.updateInTx(tx, id, {
          currency: dto.currency,
          subtotalAmount: subtotal,
          taxAmount,
          discountAmount,
          totalAmount: subtotal.add(taxAmount).sub(discountAmount),
          validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
          notes: dto.notes,
          items: { create: preparedItems },
        });
      }
      return this.quotationRepository.updateInTx(tx, id, {
        currency: dto.currency,
        taxAmount,
        discountAmount,
        totalAmount: subtotal.add(taxAmount).sub(discountAmount),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: dto.notes,
      });
    });
    return toQuotationResponseDto(quotation, quotation.items);
  }

  // "PDF generation" / "Email proposal" — the one forward transition
  // this phase implements (DRAFT -> SENT). Fire-and-forget email, same
  // reasoning as ContactRequestService's own confirmation email: a slow/
  // down email provider must never fail this response, since the PDF
  // itself (the response's own `pdfUrl`) is already real by the time this
  // returns.
  async send(id: string, tenantId: string): Promise<QuotationResponseDto> {
    const existing = await this.quotationRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    if (existing.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT quotations can be sent (current status: ${existing.status})`,
      );
    }

    const recipient = await this.resolveRecipient(existing.leadId, existing.clientId, tenantId);

    const pdfBuffer = await this.documentPdfService.render({
      documentLabel: 'Quotation',
      documentNumber: existing.quotationNumber,
      issuedDate: new Date(),
      validUntilOrDueDate: existing.validUntil,
      validUntilOrDueLabel: 'Valid until',
      billToName: recipient.name,
      billToEmail: recipient.email,
      currency: existing.currency,
      lineItems: existing.items.map((item) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        amount: item.amount.toString(),
      })),
      subtotalAmount: existing.subtotalAmount.toString(),
      taxAmount: existing.taxAmount.toString(),
      discountAmount: existing.discountAmount.toString(),
      totalAmount: existing.totalAmount.toString(),
      notes: existing.notes,
    });
    const pdfUrl = await this.storageService.upload({
      key: `quotations/${tenantId}/${existing.id}.pdf`,
      body: pdfBuffer,
      contentType: 'application/pdf',
    });

    const updated = await this.quotationRepository.update({
      where: { id },
      data: { status: QuotationStatus.SENT, issuedAt: new Date(), pdfUrl },
    });

    if (recipient.email) {
      void this.jobRunner
        .run(this.sendEmailJob, {
          to: recipient.email,
          subject: `Quotation ${existing.quotationNumber}`,
          html:
            `<p>Hi ${escapeHtml(recipient.name)},</p>` +
            `<p>Please find your quotation attached: <a href="${pdfUrl}">${escapeHtml(existing.quotationNumber)}</a>.</p>`,
        })
        .then((result) => {
          if (result.status === 'dead_letter') {
            this.logger.error('Quotation email exhausted retries', {
              quotationId: existing.id,
              error: result.error,
            });
          }
        })
        .catch((error) => {
          this.logger.error('Quotation email job threw unexpectedly', {
            quotationId: existing.id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    } else {
      this.logger.warn('Quotation sent with no resolvable recipient email — email not sent', {
        quotationId: existing.id,
      });
    }

    return toQuotationResponseDto(updated, existing.items);
  }

  async accept(id: string, tenantId: string): Promise<QuotationResponseDto> {
    const existing = await this.quotationRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    if (existing.status !== QuotationStatus.SENT) {
      throw new BadRequestException(
        `Only SENT quotations can be accepted (current status: ${existing.status})`,
      );
    }
    const updated = await this.quotationRepository.update({
      where: { id },
      data: { status: QuotationStatus.ACCEPTED },
    });
    return toQuotationResponseDto(updated, existing.items);
  }

  async reject(
    id: string,
    _dto: RejectQuotationDto,
    tenantId: string,
  ): Promise<QuotationResponseDto> {
    const existing = await this.quotationRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Quotation ${id} not found`);
    }
    if (existing.status !== QuotationStatus.SENT) {
      throw new BadRequestException(
        `Only SENT quotations can be rejected (current status: ${existing.status})`,
      );
    }
    const updated = await this.quotationRepository.update({
      where: { id },
      data: { status: QuotationStatus.REJECTED },
    });
    return toQuotationResponseDto(updated, existing.items);
  }

  private assertExactlyOneSubject(leadId?: string, clientId?: string): void {
    if (Boolean(leadId) === Boolean(clientId)) {
      throw new BadRequestException('Exactly one of leadId or clientId must be provided');
    }
  }

  private assertEditable(status: QuotationStatus): void {
    if (!(QUOTATION_EDITABLE_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(
        `Only DRAFT quotations can be edited (current status: ${status})`,
      );
    }
  }

  private async resolveRecipient(
    leadId: string | null,
    clientId: string | null,
    tenantId: string,
  ): Promise<{ name: string; email: string | null }> {
    if (leadId) {
      const lead = await this.leadRepository.findActiveById(leadId, tenantId);
      return { name: lead?.contactName ?? 'there', email: lead?.contactEmail ?? null };
    }
    if (clientId) {
      const client = await this.clientRepository.findActiveById(clientId, tenantId);
      return { name: client?.name ?? 'there', email: client?.primaryEmail ?? null };
    }
    return { name: 'there', email: null };
  }

  private async generateQuotationNumber(tenantId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    const count = await this.quotationRepository.countForTenantAndYear(tenantId, year);
    return `${QUOTATION_NUMBER_PREFIX}-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
