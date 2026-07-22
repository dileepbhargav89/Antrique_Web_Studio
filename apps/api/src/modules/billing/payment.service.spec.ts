import { BadRequestException, NotFoundException, NotImplementedException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './repositories/payment.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { AllocatePaymentDto } from './dto/allocate-payment.dto';
import { InvoiceStatus, PaymentStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createPaymentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pay-1',
    tenantId: TENANT_ID,
    invoiceId: null,
    paymentMethodId: null,
    method: 'Cash',
    reference: null,
    amount: new Prisma.Decimal('100.00'),
    currency: 'INR',
    status: PaymentStatus.SUCCEEDED,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createInvoiceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'inv-1',
    tenantId: TENANT_ID,
    totalAmount: new Prisma.Decimal('200.00'),
    amountPaid: new Prisma.Decimal('0'),
    status: InvoiceStatus.SENT,
    ...overrides,
  };
}

function createFakePaymentRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findById: jest.fn(async () => createPaymentRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
    createInTx: jest.fn(async () => createPaymentRow()),
    createAllocationInTx: jest.fn(async () => ({})),
    sumAllocationsInTx: jest.fn(async () => new Prisma.Decimal(0)),
    findActivePaymentMethodById: jest.fn(async () => null),
    ...overrides,
  } as unknown as PaymentRepository & Record<string, jest.Mock>;
}

function createFakeInvoiceRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createInvoiceRow()),
    updateInTx: jest.fn(async () => ({})),
    ...overrides,
  } as unknown as InvoiceRepository;
}

describe('PaymentService', () => {
  function createService(
    overrides: {
      paymentRepository?: PaymentRepository;
      invoiceRepository?: InvoiceRepository;
    } = {},
  ) {
    return new PaymentService(
      overrides.paymentRepository ?? createFakePaymentRepository(),
      overrides.invoiceRepository ?? createFakeInvoiceRepository(),
    );
  }

  describe('record()', () => {
    it('records a payment unallocated when no invoiceId is given', async () => {
      const paymentRepository = createFakePaymentRepository();
      const invoiceRepository = createFakeInvoiceRepository();
      const service = createService({ paymentRepository, invoiceRepository });
      const dto = Object.assign(new RecordPaymentDto(), { amount: '100.00', method: 'Cash' });

      await service.record(dto, TENANT_ID);

      expect(paymentRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: TENANT_ID, invoiceId: undefined, method: 'Cash' }),
      );
      expect(paymentRepository.createAllocationInTx).not.toHaveBeenCalled();
      expect(invoiceRepository.updateInTx).not.toHaveBeenCalled();
    });

    it('immediately allocates the full amount when invoiceId is given ("Record payment" + auto-allocate)', async () => {
      const paymentRepository = createFakePaymentRepository();
      const invoiceRepository = createFakeInvoiceRepository();
      const service = createService({ paymentRepository, invoiceRepository });
      const dto = Object.assign(new RecordPaymentDto(), {
        amount: '100.00',
        method: 'Cash',
        invoiceId: 'inv-1',
      });

      await service.record(dto, TENANT_ID);

      expect(paymentRepository.createAllocationInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: TENANT_ID,
          invoiceId: 'inv-1',
          amount: expect.any(Prisma.Decimal),
        }),
      );
      expect(invoiceRepository.updateInTx).toHaveBeenCalledWith(
        expect.anything(),
        'inv-1',
        expect.objectContaining({ amountPaid: expect.any(Prisma.Decimal) }),
      );
    });

    it('marks the invoice PAID when the payment brings amountPaid to totalAmount ("Mark invoice paid")', async () => {
      const paymentRepository = createFakePaymentRepository();
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () =>
          createInvoiceRow({ totalAmount: new Prisma.Decimal('100.00') }),
        ),
      });
      const service = createService({ paymentRepository, invoiceRepository });
      const dto = Object.assign(new RecordPaymentDto(), {
        amount: '100.00',
        method: 'Cash',
        invoiceId: 'inv-1',
      });

      await service.record(dto, TENANT_ID);

      expect(invoiceRepository.updateInTx).toHaveBeenCalledWith(
        expect.anything(),
        'inv-1',
        expect.objectContaining({ status: InvoiceStatus.PAID }),
      );
    });

    it('rejects when neither paymentMethodId nor method is given', async () => {
      const service = createService();
      const dto = Object.assign(new RecordPaymentDto(), { amount: '100.00' });

      await expect(service.record(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a non-positive amount', async () => {
      const service = createService();
      const dto = Object.assign(new RecordPaymentDto(), { amount: '0', method: 'Cash' });

      await expect(service.record(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects recording a payment against a VOID invoice ("Void invoices reject payments")', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () => createInvoiceRow({ status: InvoiceStatus.VOID })),
      });
      const service = createService({ invoiceRepository });
      const dto = Object.assign(new RecordPaymentDto(), {
        amount: '100.00',
        method: 'Cash',
        invoiceId: 'inv-1',
      });

      await expect(service.record(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a payment that would exceed the invoice\'s remaining balance ("Paid amount never exceeds invoice total")', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () =>
          createInvoiceRow({ totalAmount: new Prisma.Decimal('50.00') }),
        ),
      });
      const service = createService({ invoiceRepository });
      const dto = Object.assign(new RecordPaymentDto(), {
        amount: '100.00',
        method: 'Cash',
        invoiceId: 'inv-1',
      });

      await expect(service.record(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('resolves method text from paymentMethodId when given', async () => {
      const paymentRepository = createFakePaymentRepository({
        findActivePaymentMethodById: jest.fn(async () => ({ id: 'pm-1', name: 'Bank Transfer' })),
      });
      const service = createService({ paymentRepository });
      const dto = Object.assign(new RecordPaymentDto(), {
        amount: '100.00',
        paymentMethodId: 'pm-1',
      });

      await service.record(dto, TENANT_ID);

      expect(paymentRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ method: 'Bank Transfer', paymentMethodId: 'pm-1' }),
      );
    });
  });

  describe('allocate()', () => {
    it("allocates the given amount and updates the invoice's amountPaid", async () => {
      const paymentRepository = createFakePaymentRepository();
      const invoiceRepository = createFakeInvoiceRepository();
      const service = createService({ paymentRepository, invoiceRepository });
      const dto = Object.assign(new AllocatePaymentDto(), { invoiceId: 'inv-1', amount: '50.00' });

      await service.allocate('pay-1', dto, TENANT_ID);

      expect(paymentRepository.createAllocationInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ paymentId: 'pay-1', invoiceId: 'inv-1' }),
      );
    });

    it('rejects an allocation exceeding the payment\'s remaining unallocated balance ("Payment allocations cannot exceed payment amount")', async () => {
      const paymentRepository = createFakePaymentRepository({
        sumAllocationsInTx: jest.fn(async () => new Prisma.Decimal('80.00')),
      });
      const service = createService({ paymentRepository });
      const dto = Object.assign(new AllocatePaymentDto(), { invoiceId: 'inv-1', amount: '50.00' });

      await expect(service.allocate('pay-1', dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the payment does not exist', async () => {
      const paymentRepository = createFakePaymentRepository({
        findById: jest.fn(async () => null),
      });
      const service = createService({ paymentRepository });
      const dto = Object.assign(new AllocatePaymentDto(), { invoiceId: 'inv-1', amount: '50.00' });

      await expect(service.allocate('missing', dto, TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refundPlaceholder()', () => {
    it('throws NotImplementedException for an existing payment ("Refund placeholder")', async () => {
      const service = createService();

      await expect(service.refundPlaceholder('pay-1', TENANT_ID)).rejects.toThrow(
        NotImplementedException,
      );
    });

    it('throws NotFoundException when the payment does not exist', async () => {
      const paymentRepository = createFakePaymentRepository({
        findById: jest.fn(async () => null),
      });
      const service = createService({ paymentRepository });

      await expect(service.refundPlaceholder('missing', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
