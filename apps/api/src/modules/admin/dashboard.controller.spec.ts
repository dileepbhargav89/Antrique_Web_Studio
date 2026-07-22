import { Test } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { AuditRepository } from './repositories/audit.repository';
import { OrderRepository } from '../orders/repositories/order.repository';
import { InventoryService } from '../inventory/inventory.service';
import { InvoiceRepository } from '../billing/repositories/invoice.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { FollowUpRepository } from '../crm/repositories/follow-up.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER } from '../../logging';
import { PerformanceLogger } from '../../logging';
import { Prisma } from '../../../generated/prisma/client';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

// Same reasoning as modules/billing/invoice.controller.spec.ts — resolves
// through a real Nest TestingModule so DI wiring itself is verified.
// `InventoryService` is mocked wholesale (`useValue`), not reconstructed
// from its own real constructor dependencies — same pragmatic choice a
// controller-level DI test always makes about a cross-module dependency
// several layers removed from what this spec is actually verifying.
describe('DashboardController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        DashboardService,
        { provide: DashboardRepository, useValue: { findActiveWidgets: jest.fn(async () => []) } },
        {
          provide: AuditRepository,
          useValue: { countSystemEventsBySeverity: jest.fn(async () => 0) },
        },
        {
          provide: OrderRepository,
          useValue: {
            getRevenueSummary: jest.fn(async () => ({
              orderCount: 1,
              revenue: new Prisma.Decimal('100.00'),
              averageOrderValue: new Prisma.Decimal('100.00'),
            })),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            getStockValuation: jest.fn(async () => ({
              itemCount: 0,
              valuation: new Prisma.Decimal('0'),
            })),
            getLowStockItems: jest.fn(async () => []),
          },
        },
        {
          provide: InvoiceRepository,
          useValue: {
            getOutstandingSummary: jest.fn(async () => ({
              count: 0,
              outstandingAmount: new Prisma.Decimal('0'),
            })),
            getCollectionSummary: jest.fn(async () => ({
              totalAmount: new Prisma.Decimal('0'),
              amountPaid: new Prisma.Decimal('0'),
              collectionRate: new Prisma.Decimal('0'),
            })),
          },
        },
        { provide: LeadRepository, useValue: { count: jest.fn(async () => 0) } },
        { provide: FollowUpRepository, useValue: { count: jest.fn(async () => 0) } },
        { provide: ProductRepository, useValue: { count: jest.fn(async () => 0) } },
        { provide: TokenService, useValue: { verifyAccessToken: jest.fn() } },
        {
          provide: AuthorizationService,
          useValue: { resolveRoleKeys: jest.fn(), resolvePermissionKeys: jest.fn() },
        },
        { provide: AUDIT_LOGGER, useValue: { log: jest.fn() } },
        {
          provide: PerformanceLogger,
          useValue: { measureAsync: (_op: string, fn: () => unknown) => fn() },
        },
      ],
    }).compile();

    return moduleRef.get(DashboardController);
  }

  it('resolves DashboardService via DI and delegates overview() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.overview({} as never, TENANT);

    expect(result.modules).toHaveLength(5);
    expect(result.widgets).toEqual([]);
  });

  it('delegates kpis() for a single module with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.kpis('orders', {} as never, TENANT);

    expect(result.module).toBe('orders');
    expect(result.metrics.orderCount).toBe(1);
  });
});
