import { Test } from '@nestjs/testing';
import { ReportController } from './report.controller';
import { ReportingService } from './reporting.service';
import { ReportRepository } from './repositories/report.repository';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { AuditRepository } from './repositories/audit.repository';
import { OrderRepository } from '../orders/repositories/order.repository';
import { InventoryService } from '../inventory/inventory.service';
import { InvoiceRepository } from '../billing/repositories/invoice.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { FollowUpRepository } from '../crm/repositories/follow-up.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { GenerateReportDto } from './dto/generate-report.dto';
import { TokenService } from '../../jwt/token.service';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AUDIT_LOGGER, RequestContextService } from '../../logging';
import { PerformanceLogger } from '../../logging';
import { CacheService } from '../../cache/cache.service';
import { InMemoryCacheStore } from '../../cache/in-memory-cache.store';
import { MetricsService } from '../../metrics/metrics.service';
import { ReportType, Prisma } from '../../../generated/prisma/client';

const TENANT: { tenantId: string } = { tenantId: '00000000-0000-7000-8000-000000000001' };

function createReportRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'report-1',
    tenantId: TENANT.tenantId,
    type: ReportType.SALES_SUMMARY,
    parameters: { dateFrom: null, dateTo: null },
    result: { module: 'orders', metrics: { orderCount: 1 } },
    generatedByUserId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

// Same reasoning as dashboard.controller.spec.ts — `DashboardService`'s
// own cross-module dependencies are mocked wholesale via `useValue`;
// this spec verifies ReportController's/ReportingService's own DI
// wiring, not DashboardService's aggregation logic (already covered by
// dashboard.service.spec.ts).
describe('ReportController', () => {
  async function createController() {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportController],
      providers: [
        ReportingService,
        {
          provide: ReportRepository,
          useValue: {
            create: jest.fn(async () => createReportRow()),
            findById: jest.fn(async () => createReportRow()),
            findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
          },
        },
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
        RequestContextService,
        {
          provide: PerformanceLogger,
          useValue: { measureAsync: (_op: string, fn: () => unknown) => fn() },
        },
        {
          provide: CacheService,
          useValue: new CacheService(new InMemoryCacheStore(), new MetricsService()),
        },
      ],
    }).compile();

    return moduleRef.get(ReportController);
  }

  it('resolves ReportingService via DI and delegates generate() with the resolved tenantId', async () => {
    const controller = await createController();
    const dto = Object.assign(new GenerateReportDto(), { type: ReportType.SALES_SUMMARY });

    const result = await controller.generate(dto, TENANT);

    expect(result.type).toBe(ReportType.SALES_SUMMARY);
  });

  it('delegates list() with the resolved tenantId', async () => {
    const controller = await createController();

    const result = await controller.list({ page: 1, limit: 20 } as never, TENANT);

    expect(result.items).toEqual([]);
  });

  it('delegates findById() with the resolved tenantId ("Download metadata")', async () => {
    const controller = await createController();

    const result = await controller.findById('report-1', TENANT);

    expect(result.id).toBe('report-1');
  });
});
