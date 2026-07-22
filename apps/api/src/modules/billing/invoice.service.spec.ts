import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './repositories/invoice.repository';
import { TaxRepository } from './repositories/tax.repository';
import { TaxService } from './tax.service';
import { OrderRepository } from '../orders/repositories/order.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { InvoiceStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createInvoiceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'inv-1',
    tenantId: TENANT_ID,
    clientId: null,
    customerId: 'cust-1',
    orderId: 'order-1',
    taxRateId: null,
    invoiceNumber: 'INV-2026-00001',
    currency: 'INR',
    subtotalAmount: new Prisma.Decimal('200.00'),
    taxAmount: new Prisma.Decimal('0'),
    discountAmount: new Prisma.Decimal('0'),
    totalAmount: new Prisma.Decimal('200.00'),
    amountPaid: new Prisma.Decimal('0'),
    status: InvoiceStatus.DRAFT,
    issuedDate: null,
    dueDate: null,
    items: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createOrderRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'order-1',
    tenantId: TENANT_ID,
    customerId: 'cust-1',
    subtotal: new Prisma.Decimal('200.00'),
    total: new Prisma.Decimal('200.00'),
    items: [
      {
        productVariantId: 'variant-1',
        quantity: new Prisma.Decimal('2'),
        unitPrice: new Prisma.Decimal('100.00'),
        lineTotal: new Prisma.Decimal('200.00'),
      },
    ],
    ...overrides,
  };
}

function createUniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function createFakeInvoiceRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createInvoiceRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    update: jest.fn(async () => createInvoiceRow()),
    countForTenantAndYear: jest.fn(async () => 0),
    runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
    createInTx: jest.fn(async () => createInvoiceRow()),
    ...overrides,
  } as unknown as InvoiceRepository;
}

function createFakeTaxRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    ...overrides,
  } as unknown as TaxRepository;
}

function createFakeOrderRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createOrderRow()),
    ...overrides,
  } as unknown as OrderRepository;
}

function createFakeProductRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findVariantById: jest.fn(async () => ({ id: 'variant-1', sku: 'RING-GOLD-7' })),
    findVariantsByIds: jest.fn(async () => [{ id: 'variant-1', sku: 'RING-GOLD-7' }]),
    ...overrides,
  } as unknown as ProductRepository;
}

describe('InvoiceService', () => {
  function createService(
    overrides: {
      invoiceRepository?: InvoiceRepository;
      taxRepository?: TaxRepository;
      orderRepository?: OrderRepository;
      productRepository?: ProductRepository;
    } = {},
  ) {
    const taxRepository = overrides.taxRepository ?? createFakeTaxRepository();
    return new InvoiceService(
      overrides.invoiceRepository ?? createFakeInvoiceRepository(),
      taxRepository,
      new TaxService(taxRepository),
      overrides.orderRepository ?? createFakeOrderRepository(),
      overrides.productRepository ?? createFakeProductRepository(),
    );
  }

  describe('createFromOrder()', () => {
    it('creates an invoice with one item per order item, subtotal derived from line items', async () => {
      const invoiceRepository = createFakeInvoiceRepository();
      const service = createService({ invoiceRepository });
      const dto = Object.assign(new CreateInvoiceDto(), { orderId: 'order-1' });

      await service.createFromOrder(dto, TENANT_ID);

      expect(invoiceRepository.createInTx).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tenantId: TENANT_ID,
          customerId: 'cust-1',
          orderId: 'order-1',
          status: InvoiceStatus.DRAFT,
          subtotalAmount: expect.any(Prisma.Decimal),
          totalAmount: expect.any(Prisma.Decimal),
        }),
      );
      const call = (invoiceRepository.createInTx as jest.Mock).mock.calls[0][1];
      expect(call.subtotalAmount.toString()).toBe('200');
      expect(call.totalAmount.toString()).toBe('200');
      expect(call.items.create).toHaveLength(1);
      expect(call.items.create[0].description).toBe('SKU: RING-GOLD-7');
    });

    it('computes tax when a taxRateId is given ("Calculate tax")', async () => {
      const invoiceRepository = createFakeInvoiceRepository();
      const taxRepository = createFakeTaxRepository({
        findActiveById: jest.fn(async () => ({ id: 'tax-1', rate: new Prisma.Decimal('18.00') })),
      });
      const service = createService({ invoiceRepository, taxRepository });
      const dto = Object.assign(new CreateInvoiceDto(), { orderId: 'order-1', taxRateId: 'tax-1' });

      await service.createFromOrder(dto, TENANT_ID);

      const call = (invoiceRepository.createInTx as jest.Mock).mock.calls[0][1];
      expect(call.taxAmount.toString()).toBe('36');
      expect(call.totalAmount.toString()).toBe('236');
    });

    it('rejects an orderId that does not resolve within the caller tenant', async () => {
      const orderRepository = createFakeOrderRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ orderRepository });
      const dto = Object.assign(new CreateInvoiceDto(), { orderId: 'missing' });

      await expect(service.createFromOrder(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a taxRateId that does not resolve within the caller tenant', async () => {
      const service = createService();
      const dto = Object.assign(new CreateInvoiceDto(), {
        orderId: 'order-1',
        taxRateId: 'missing',
      });

      await expect(service.createFromOrder(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('falls back to a generic description when the product variant cannot be resolved', async () => {
      const invoiceRepository = createFakeInvoiceRepository();
      const productRepository = createFakeProductRepository({
        findVariantsByIds: jest.fn(async () => []),
      });
      const service = createService({ invoiceRepository, productRepository });
      const dto = Object.assign(new CreateInvoiceDto(), { orderId: 'order-1' });

      await service.createFromOrder(dto, TENANT_ID);

      const call = (invoiceRepository.createInTx as jest.Mock).mock.calls[0][1];
      expect(call.items.create[0].description).toBe('Product variant variant-1');
    });

    it('retries invoice number generation on a collision and succeeds once a unique number is generated', async () => {
      const createInTx = jest
        .fn()
        .mockRejectedValueOnce(createUniqueConstraintError())
        .mockResolvedValueOnce(createInvoiceRow());
      const invoiceRepository = createFakeInvoiceRepository({ createInTx });
      const service = createService({ invoiceRepository });
      const dto = Object.assign(new CreateInvoiceDto(), { orderId: 'order-1' });

      await service.createFromOrder(dto, TENANT_ID);

      expect(createInTx).toHaveBeenCalledTimes(2);
    });

    it('throws ConflictException after exhausting every retry attempt on repeated collisions', async () => {
      const createInTx = jest.fn().mockRejectedValue(createUniqueConstraintError());
      const invoiceRepository = createFakeInvoiceRepository({ createInTx });
      const service = createService({ invoiceRepository });
      const dto = Object.assign(new CreateInvoiceDto(), { orderId: 'order-1' });

      await expect(service.createFromOrder(dto, TENANT_ID)).rejects.toThrow(ConflictException);
      expect(createInTx).toHaveBeenCalledTimes(5);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the invoice does not exist', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ invoiceRepository });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('rejects updating a non-draft invoice ("Prevent modification after issuance")', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () => createInvoiceRow({ status: InvoiceStatus.SENT })),
      });
      const service = createService({ invoiceRepository });

      await expect(service.update('inv-1', new UpdateInvoiceDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(invoiceRepository.update).not.toHaveBeenCalled();
    });

    it('recomputes tax/total when taxRateId changes', async () => {
      const invoiceRepository = createFakeInvoiceRepository();
      const taxRepository = createFakeTaxRepository({
        findActiveById: jest.fn(async () => ({ id: 'tax-1', rate: new Prisma.Decimal('18.00') })),
      });
      const service = createService({ invoiceRepository, taxRepository });
      const dto = Object.assign(new UpdateInvoiceDto(), { taxRateId: 'tax-1' });

      await service.update('inv-1', dto, TENANT_ID);

      expect(invoiceRepository.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({
          taxRateId: 'tax-1',
          taxAmount: expect.any(Prisma.Decimal),
          totalAmount: expect.any(Prisma.Decimal),
        }),
      });
    });

    it('throws NotFoundException when the invoice does not exist', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ invoiceRepository });

      await expect(service.update('missing', new UpdateInvoiceDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('issue()', () => {
    it('sets status to SENT and stamps issuedDate', async () => {
      const invoiceRepository = createFakeInvoiceRepository();
      const service = createService({ invoiceRepository });

      await service.issue('inv-1', TENANT_ID);

      expect(invoiceRepository.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: InvoiceStatus.SENT, issuedDate: expect.any(Date) },
      });
    });

    it('rejects issuing a non-draft invoice', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () => createInvoiceRow({ status: InvoiceStatus.PAID })),
      });
      const service = createService({ invoiceRepository });

      await expect(service.issue('inv-1', TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('void()', () => {
    it('sets status to VOID from a voidable status', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () => createInvoiceRow({ status: InvoiceStatus.SENT })),
      });
      const service = createService({ invoiceRepository });

      await service.void('inv-1', new VoidInvoiceDto(), TENANT_ID);

      expect(invoiceRepository.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: InvoiceStatus.VOID },
      });
    });

    it('rejects voiding a PAID invoice', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () => createInvoiceRow({ status: InvoiceStatus.PAID })),
      });
      const service = createService({ invoiceRepository });

      await expect(service.void('inv-1', new VoidInvoiceDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects voiding an already-void invoice', async () => {
      const invoiceRepository = createFakeInvoiceRepository({
        findActiveById: jest.fn(async () => createInvoiceRow({ status: InvoiceStatus.VOID })),
      });
      const service = createService({ invoiceRepository });

      await expect(service.void('inv-1', new VoidInvoiceDto(), TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
