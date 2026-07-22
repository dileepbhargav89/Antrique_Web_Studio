import { Test } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentRepository } from './repositories/payment.repository';
import { InvoiceRepository } from './repositories/invoice.repository';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';
import { InvoiceStatus, PaymentStatus } from '../../../generated/prisma/enums';
import { Prisma } from '../../../generated/prisma/client';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createPaymentRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pay-1',
    tenantId: TENANT.tenantId,
    invoiceId: null,
    paymentMethodId: null,
    method: 'Cash',
    reference: null,
    amount: new Prisma.Decimal('100.00'),
    currency: 'INR',
    status: PaymentStatus.SUCCEEDED,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PaymentController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: {
            findById: jest.fn(async () => createPaymentRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
            runInTransaction: jest.fn(async (work: (tx: unknown) => Promise<unknown>) => work({})),
            createInTx: jest.fn(async () => createPaymentRow()),
            createAllocationInTx: jest.fn(async () => ({})),
            sumAllocationsInTx: jest.fn(async () => new Prisma.Decimal(0)),
            findActivePaymentMethodById: jest.fn(async () => null),
          },
        },
        {
          provide: InvoiceRepository,
          useValue: {
            findActiveById: jest.fn(async () => ({
              id: 'inv-1',
              totalAmount: new Prisma.Decimal('200.00'),
              amountPaid: new Prisma.Decimal('0'),
              status: InvoiceStatus.SENT,
            })),
            updateInTx: jest.fn(async () => ({})),
          },
        },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
      ],
    }).compile();

    return moduleRef.get(PaymentController);
  }

  it('resolves PaymentService via DI and delegates record() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new RecordPaymentDto(), { amount: '100.00', method: 'Cash' });

    const result = await controller.record(dto, TENANT);

    expect(result.method).toBe('Cash');
  });

  it('resolves PaymentService via DI and delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates refund() and surfaces the NotImplementedException as-is', async () => {
    const controller = await createController();

    await expect(controller.refund('pay-1', TENANT)).rejects.toThrow(
      'Refund processing requires payment gateway integration, which is out of scope for this milestone',
    );
  });
});
