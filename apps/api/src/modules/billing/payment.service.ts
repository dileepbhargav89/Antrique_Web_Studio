import {
  BadRequestException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PaymentRepository } from './repositories/payment.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { AllocatePaymentDto } from './dto/allocate-payment.dto';
import { PaymentListQueryDto } from './dto/payment-list-query.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { toPaymentResponseDto } from './mappers/payment.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { InvoiceStatus, PaymentStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

// Business logic + repository orchestration + mapping.
//
// This milestone's own "Payments" business responsibilities:
// - "Record payment" — creates a `Payment` row (append-only — see
//   `Payment`'s own schema comment). When `invoiceId` is given, this
//   ALSO immediately allocates the full amount to it (the common
//   single-invoice case), in the same transaction — otherwise the
//   payment is recorded unallocated, for a later `allocate()` call.
// - "Partial payment"/"Multiple payments" — satisfied structurally: an
//   invoice's own `amountPaid` accumulates across as many `Payment`/
//   `PaymentAllocation` rows as needed; nothing here assumes exactly one
//   payment per invoice.
// - "Allocate payment" — applies (more of) an existing Payment's amount
//   to a specific Invoice. "Payment allocations cannot exceed payment
//   amount" (checked against the payment's own remaining unallocated
//   balance) and "Paid amount never exceeds invoice total" (checked
//   against the invoice's own remaining balance — the database's own
//   pre-existing `invoices_amount_paid_check` is the real backstop) are
//   both re-verified inside the SAME transaction as the write.
// - "Mark invoice paid" — when an allocation brings `amountPaid` up to
//   `totalAmount`, the invoice's own `status` flips to `PAID` in the
//   same transaction.
// - "Void invoices reject payments" — both `record()` (when an
//   `invoiceId` is given) and `allocate()` check the target invoice's
//   own status first.
@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly invoiceRepository: InvoiceRepository,
  ) {}

  async record(dto: RecordPaymentDto, tenantId: string): Promise<PaymentResponseDto> {
    if (!dto.paymentMethodId && !dto.method) {
      throw new BadRequestException('Either paymentMethodId or method must be provided');
    }
    const method = await this.resolveMethodText(dto.method, dto.paymentMethodId, tenantId);
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException('amount must be greater than zero');
    }

    let invoice = null;
    if (dto.invoiceId) {
      invoice = await this.invoiceRepository.findActiveById(dto.invoiceId, tenantId);
      if (!invoice) {
        throw new BadRequestException(`Invoice ${dto.invoiceId} not found`);
      }
      this.assertInvoiceAcceptsPayments(invoice.status);
      this.assertWithinRemainingInvoiceBalance(invoice.totalAmount, invoice.amountPaid, amount);
    }

    const payment = await this.paymentRepository.runInTransaction(async (tx) => {
      const created = await this.paymentRepository.createInTx(tx, {
        tenantId,
        invoiceId: dto.invoiceId,
        paymentMethodId: dto.paymentMethodId,
        method,
        reference: dto.reference,
        amount,
        status: PaymentStatus.SUCCEEDED,
      });

      if (dto.invoiceId && invoice) {
        await this.paymentRepository.createAllocationInTx(tx, {
          tenantId,
          paymentId: created.id,
          invoiceId: dto.invoiceId,
          amount,
        });
        await this.applyAllocationToInvoiceInTx(tx, invoice, amount);
      }

      return created;
    });

    return toPaymentResponseDto(payment);
  }

  async findById(id: string, tenantId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findById(id, tenantId);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    return toPaymentResponseDto(payment);
  }

  async list(
    query: PaymentListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<PaymentResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const { items, total } = await this.paymentRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toPaymentResponseDto), total, page, limit);
  }

  async allocate(
    paymentId: string,
    dto: AllocatePaymentDto,
    tenantId: string,
  ): Promise<PaymentResponseDto> {
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const payment = await this.paymentRepository.findById(paymentId, tenantId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    const invoice = await this.invoiceRepository.findActiveById(dto.invoiceId, tenantId);
    if (!invoice) {
      throw new BadRequestException(`Invoice ${dto.invoiceId} not found`);
    }
    this.assertInvoiceAcceptsPayments(invoice.status);
    this.assertWithinRemainingInvoiceBalance(invoice.totalAmount, invoice.amountPaid, amount);

    await this.paymentRepository.runInTransaction(async (tx) => {
      const alreadyAllocated = await this.paymentRepository.sumAllocationsInTx(
        tx,
        paymentId,
        tenantId,
      );
      const remaining = payment.amount.sub(alreadyAllocated);
      if (amount.gt(remaining)) {
        throw new BadRequestException(
          `Allocation of ${amount.toString()} exceeds the payment's remaining unallocated balance of ${remaining.toString()}`,
        );
      }

      await this.paymentRepository.createAllocationInTx(tx, {
        tenantId,
        paymentId,
        invoiceId: dto.invoiceId,
        amount,
      });
      await this.applyAllocationToInvoiceInTx(tx, invoice, amount);
    });

    return toPaymentResponseDto(payment);
  }

  // "Refund placeholder" — this milestone's own explicit "Do NOT
  // Implement: ...Webhooks..." excludes real gateway-backed refunds, and
  // `payments` has `UPDATE`/`DELETE` revoked at the database-privilege
  // level (see Payment's own schema comment) — there is no row this
  // could mutate even if it tried. A genuine stub, not a silent no-op:
  // validates the payment exists (tenant-scoped) then reports the real
  // reason it can't proceed, rather than pretending to succeed.
  async refundPlaceholder(id: string, tenantId: string): Promise<never> {
    const payment = await this.paymentRepository.findById(id, tenantId);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    throw new NotImplementedException(
      'Refund processing requires payment gateway integration, which is out of scope for this milestone',
    );
  }

  private assertInvoiceAcceptsPayments(status: InvoiceStatus): void {
    if (status === InvoiceStatus.VOID) {
      throw new BadRequestException('Void invoices cannot accept payments');
    }
  }

  private assertWithinRemainingInvoiceBalance(
    totalAmount: Prisma.Decimal,
    amountPaid: Prisma.Decimal,
    amount: Prisma.Decimal,
  ): void {
    const remaining = totalAmount.sub(amountPaid);
    if (amount.gt(remaining)) {
      throw new BadRequestException(
        `Payment of ${amount.toString()} would exceed the invoice's remaining balance of ${remaining.toString()}`,
      );
    }
  }

  // "Mark invoice paid" — shared by record()/allocate(), always inside
  // the SAME transaction as the PaymentAllocation write.
  private async applyAllocationToInvoiceInTx(
    tx: Prisma.TransactionClient,
    invoice: { id: string; totalAmount: Prisma.Decimal; amountPaid: Prisma.Decimal },
    amount: Prisma.Decimal,
  ): Promise<void> {
    const newAmountPaid = invoice.amountPaid.add(amount);
    const newStatus = newAmountPaid.gte(invoice.totalAmount) ? InvoiceStatus.PAID : undefined;
    await this.invoiceRepository.updateInTx(tx, invoice.id, {
      amountPaid: newAmountPaid,
      ...(newStatus ? { status: newStatus } : {}),
    });
  }

  // Resolves the required `method` string column from whichever of
  // `method`/`paymentMethodId` the caller gave — same "dual input,
  // resolve to the NOT NULL text column" pattern
  // `LeadService.resolveSourceText()` (Milestone 9) already established.
  private async resolveMethodText(
    method: string | undefined,
    paymentMethodId: string | undefined,
    tenantId: string,
  ): Promise<string> {
    if (paymentMethodId) {
      const resolved = await this.paymentRepository.findActivePaymentMethodById(
        paymentMethodId,
        tenantId,
      );
      if (!resolved) {
        throw new BadRequestException(`Payment method ${paymentMethodId} not found`);
      }
      return resolved.name;
    }
    return method!;
  }
}
