import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceRepository } from './repositories/invoice.repository';
import { TaxRepository } from './repositories/tax.repository';
import { TaxService } from './tax.service';
import { OrderRepository } from '../orders/repositories/order.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { InvoiceListQueryDto } from './dto/invoice-list-query.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { toInvoiceResponseDto } from './mappers/invoice.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import {
  INVOICE_EDITABLE_STATUSES,
  INVOICE_NUMBER_GENERATION_MAX_ATTEMPTS,
  INVOICE_NUMBER_PREFIX,
  INVOICE_VOIDABLE_STATUSES,
} from './constants/billing.constant';
import { InvoiceStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';
import { isUniqueConstraintViolation } from '../../utils/prisma-error.util';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning.
//
// This milestone's own "Invoice" business responsibilities:
// - "Create from Order" — the only creation path this milestone builds
//   (Invoice.clientId's own pre-existing, still-unconsumed agency-
//   billing path is untouched — see schema.prisma's own comment).
//   Validates the order (via `OrderRepository`, reused, not
//   duplicated) and any given `taxRateId` (via `TaxRepository`, same
//   module); builds one `InvoiceItem` per `OrderItem`, resolving a
//   human-readable description from the product variant's own SKU
//   (`ProductRepository`, reused from CatalogModule — the same
//   repository `OrdersModule` itself already imports for an identical
//   reason).
// - "Calculate totals"/"Calculate tax" — `subtotalAmount` is the sum of
//   the prepared `InvoiceItem.amount`s; `taxAmount` is
//   `TaxService.calculateTax()` (reused, not duplicated) against the
//   resolved `TaxRate`, or zero when none is given; `totalAmount =
//   subtotal + tax - discount` (`discountAmount` stays the pre-existing
//   Phase 1.1A column, always zero this milestone — no "Calculate
//   discount" business rule was asked for).
// - "Invoice numbers generated automatically" — `generateInvoiceNumber()`,
//   a per-tenant-per-year sequence with a bounded retry-on-collision
//   loop (the existing partial unique index on `(tenantId,
//   invoiceNumber)` is the race-free backstop).
// - "Prevent modification after issuance" — `assertEditable()`, shared
//   by `update()`; `issue()`/`void()` are themselves the sanctioned ways
//   to change a non-draft invoice's own status.
@Injectable()
export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly taxRepository: TaxRepository,
    private readonly taxService: TaxService,
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async createFromOrder(dto: CreateInvoiceDto, tenantId: string): Promise<InvoiceResponseDto> {
    const order = await this.orderRepository.findActiveById(dto.orderId, tenantId);
    if (!order) {
      throw new BadRequestException(`Order ${dto.orderId} not found`);
    }

    const taxRate = dto.taxRateId
      ? await this.taxRepository.findActiveById(dto.taxRateId, tenantId)
      : null;
    if (dto.taxRateId && !taxRate) {
      throw new BadRequestException(`Tax rate ${dto.taxRateId} not found`);
    }

    // Milestone 12 (Performance Engineering) — one batched
    // `findVariantsByIds()` call instead of one `findVariantById()` per
    // order item (an N+1: an order with 10 lines previously issued 10
    // separate `SELECT`s here, purely to resolve a human-readable SKU
    // string). `Set` first — an order can legitimately repeat the same
    // variant across multiple lines (see create-order.dto's own
    // validation, which allows it), and there's no reason to ask the
    // database for the same variant twice.
    const variantIds = [...new Set(order.items.map((item) => item.productVariantId))];
    const variants = await this.productRepository.findVariantsByIds(variantIds, tenantId);
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const preparedItems: Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[] = order.items.map(
      (item, index) => {
        const variant = variantById.get(item.productVariantId);
        return {
          tenantId,
          description: variant ? `SKU: ${variant.sku}` : `Product variant ${item.productVariantId}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.lineTotal,
          sortOrder: index,
        };
      },
    );

    const subtotal = preparedItems.reduce(
      (sum, i) => sum.add(i.amount as Prisma.Decimal),
      new Prisma.Decimal(0),
    );
    const taxAmount = taxRate
      ? this.taxService.calculateTax(subtotal, taxRate)
      : new Prisma.Decimal(0);
    const total = subtotal.add(taxAmount);

    let lastError: unknown;
    for (let attempt = 0; attempt < INVOICE_NUMBER_GENERATION_MAX_ATTEMPTS; attempt++) {
      const invoiceNumber = await this.generateInvoiceNumber(tenantId);
      try {
        const invoice = await this.invoiceRepository.runInTransaction((tx) =>
          this.invoiceRepository.createInTx(tx, {
            tenantId,
            customerId: order.customerId,
            orderId: order.id,
            taxRateId: dto.taxRateId,
            invoiceNumber,
            subtotalAmount: subtotal,
            taxAmount,
            totalAmount: total,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            status: InvoiceStatus.DRAFT,
            items: { create: preparedItems },
          }),
        );
        return toInvoiceResponseDto(invoice, invoice.items);
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Could not generate a unique invoice number — please retry', {
      cause: lastError,
    });
  }

  async findById(id: string, tenantId: string): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findActiveById(id, tenantId);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    return toInvoiceResponseDto(invoice, invoice.items);
  }

  async list(
    query: InvoiceListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<InvoiceResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.InvoiceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search ? { invoiceNumber: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const { items, total } = await this.invoiceRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(
      items.map((item) => toInvoiceResponseDto(item)),
      total,
      page,
      limit,
    );
  }

  // "Update draft invoice" — not literally named in this milestone's own
  // "Controllers" list (which says "Create, Issue, Void, Get, List"),
  // added anyway because leaving a named Service capability
  // permanently unreachable would be the same "dead capability" gap
  // Milestone 9's own audit caught and fixed for `LEAD_CREATED` — see
  // docs/implementation/decisions.md.
  async update(id: string, dto: UpdateInvoiceDto, tenantId: string): Promise<InvoiceResponseDto> {
    const existing = await this.invoiceRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    this.assertEditable(existing.status);

    let taxRateId = existing.taxRateId;
    let taxAmount = existing.taxAmount;
    let totalAmount = existing.totalAmount;
    if (dto.taxRateId !== undefined) {
      const taxRate = await this.taxRepository.findActiveById(dto.taxRateId, tenantId);
      if (!taxRate) {
        throw new BadRequestException(`Tax rate ${dto.taxRateId} not found`);
      }
      taxAmount = this.taxService.calculateTax(existing.subtotalAmount, taxRate);
      totalAmount = existing.subtotalAmount.add(taxAmount).sub(existing.discountAmount);
      taxRateId = dto.taxRateId;
    }

    await this.invoiceRepository.update({
      where: { id },
      data: {
        taxRateId,
        taxAmount,
        totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    const fresh = await this.invoiceRepository.findActiveById(id, tenantId);
    return toInvoiceResponseDto(fresh!, fresh!.items);
  }

  // "Mark issued" — the only forward transition this milestone
  // implements (DRAFT → SENT); `issuedDate` is stamped at the same time.
  async issue(id: string, tenantId: string): Promise<InvoiceResponseDto> {
    const existing = await this.invoiceRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    if (existing.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT invoices can be issued (current status: ${existing.status})`,
      );
    }
    const updated = await this.invoiceRepository.update({
      where: { id },
      data: { status: InvoiceStatus.SENT, issuedDate: new Date() },
    });
    return toInvoiceResponseDto(updated);
  }

  // "Void invoice" — `dto.reason` isn't persisted (`Invoice` has no
  // metadata column) — accepted for symmetry with `CancelFollowUpDto`'s
  // own shape, with nowhere to store it this milestone.
  async void(id: string, _dto: VoidInvoiceDto, tenantId: string): Promise<InvoiceResponseDto> {
    const existing = await this.invoiceRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    if (!(INVOICE_VOIDABLE_STATUSES as readonly string[]).includes(existing.status)) {
      throw new BadRequestException(
        `Invoice ${id} cannot be voided from status ${existing.status}`,
      );
    }
    const updated = await this.invoiceRepository.update({
      where: { id },
      data: { status: InvoiceStatus.VOID },
    });
    return toInvoiceResponseDto(updated);
  }

  private assertEditable(status: InvoiceStatus): void {
    if (!(INVOICE_EDITABLE_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(`Issued invoices are immutable (current status: ${status})`);
    }
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getUTCFullYear();
    const count = await this.invoiceRepository.countForTenantAndYear(tenantId, year);
    return `${INVOICE_NUMBER_PREFIX}-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
