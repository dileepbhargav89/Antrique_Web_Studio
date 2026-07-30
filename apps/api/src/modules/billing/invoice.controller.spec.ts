import { Test } from '@nestjs/testing';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './repositories/invoice.repository';
import { TaxRepository } from './repositories/tax.repository';
import { TaxService } from './tax.service';
import { OrderRepository } from '../orders/repositories/order.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';
import { InvoiceStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createInvoiceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'inv-1',
    tenantId: TENANT.tenantId,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Same reasoning as modules/orders/order.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified.
describe('InvoiceController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [InvoiceController],
      providers: [
        InvoiceService,
        {
          provide: InvoiceRepository,
          useValue: {
            findActiveById: jest.fn(async () => createInvoiceRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            update: jest.fn(async () => createInvoiceRow()),
            countForTenantAndYear: jest.fn(async () => 0),
            runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
            createInTx: jest.fn(async () => createInvoiceRow()),
          },
        },
        { provide: TaxRepository, useValue: { findActiveById: jest.fn(async () => null) } },
        TaxService,
        {
          provide: OrderRepository,
          useValue: {
            findActiveById: jest.fn(async () => ({
              id: 'order-1',
              customerId: 'cust-1',
              items: [
                {
                  productVariantId: 'variant-1',
                  quantity: new Prisma.Decimal('2'),
                  unitPrice: new Prisma.Decimal('100.00'),
                  lineTotal: new Prisma.Decimal('200.00'),
                },
              ],
            })),
          },
        },
        {
          provide: ProductRepository,
          useValue: {
            findVariantById: jest.fn(async () => ({ sku: 'RING-GOLD-7' })),
            findVariantsByIds: jest.fn(async () => [{ id: 'variant-1', sku: 'RING-GOLD-7' }]),
          },
        },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
        RequestContextService,
      ],
    }).compile();

    return moduleRef.get(InvoiceController);
  }

  it('resolves InvoiceService via DI and delegates create() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new CreateInvoiceDto(), { orderId: 'order-1' });

    const result = await controller.create(dto, TENANT);

    expect(result.orderId).toBe('order-1');
  });

  it('resolves InvoiceService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates issue() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.issue('inv-1', TENANT);

    expect(result.id).toBe('inv-1');
  });

  it('delegates void() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.void('inv-1', new VoidInvoiceDto(), TENANT);

    expect(result.id).toBe('inv-1');
  });
});
