import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { AuditRepository } from './repositories/audit.repository';
import { OrderRepository } from '../orders/repositories/order.repository';
import { InventoryService } from '../inventory/inventory.service';
import { InvoiceRepository } from '../billing/repositories/invoice.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { FollowUpRepository } from '../crm/repositories/follow-up.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { PerformanceLogger, Logger } from '../../logging';
import { Prisma } from '../../../generated/prisma/client';
import { CacheService } from '../../cache/cache.service';
import { InMemoryCacheStore } from '../../cache/in-memory-cache.store';
import { MetricsService } from '../../metrics/metrics.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// A real PerformanceLogger (Milestone 12) — plain class, no interface to
// swap behind — with a no-op fake Logger underneath, the same "real
// infra class, fake logger" pattern this codebase's own
// authorization.service.spec.ts uses for CacheService.
function createFakePerformanceLogger() {
  const noopLogger: Logger = {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };
  return new PerformanceLogger(noopLogger);
}

function createFakeDashboardRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveWidgets: jest.fn(async () => []),
    ...overrides,
  } as unknown as DashboardRepository;
}

function createFakeAuditRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    countSystemEventsBySeverity: jest.fn(async () => 0),
    ...overrides,
  } as unknown as AuditRepository;
}

function createFakeOrderRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getRevenueSummary: jest.fn(async () => ({
      orderCount: 5,
      revenue: new Prisma.Decimal('1000.00'),
      averageOrderValue: new Prisma.Decimal('200.00'),
    })),
    ...overrides,
  } as unknown as OrderRepository;
}

function createFakeInventoryService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getStockValuation: jest.fn(async () => ({
      itemCount: 3,
      valuation: new Prisma.Decimal('500.00'),
    })),
    getLowStockItems: jest.fn(async () => []),
    ...overrides,
  } as unknown as InventoryService;
}

function createFakeInvoiceRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getOutstandingSummary: jest.fn(async () => ({
      count: 2,
      outstandingAmount: new Prisma.Decimal('300.00'),
    })),
    getCollectionSummary: jest.fn(async () => ({
      totalAmount: new Prisma.Decimal('1000.00'),
      amountPaid: new Prisma.Decimal('700.00'),
      collectionRate: new Prisma.Decimal('70.00'),
    })),
    ...overrides,
  } as unknown as InvoiceRepository;
}

function createFakeLeadRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { count: jest.fn(async () => 10), ...overrides } as unknown as LeadRepository;
}

function createFakeFollowUpRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { count: jest.fn(async () => 4), ...overrides } as unknown as FollowUpRepository;
}

function createFakeProductRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return { count: jest.fn(async () => 7), ...overrides } as unknown as ProductRepository;
}

describe('DashboardService', () => {
  function createService(
    overrides: {
      dashboardRepository?: DashboardRepository;
      auditRepository?: AuditRepository;
      orderRepository?: OrderRepository;
      inventoryService?: InventoryService;
      invoiceRepository?: InvoiceRepository;
      leadRepository?: LeadRepository;
      followUpRepository?: FollowUpRepository;
      productRepository?: ProductRepository;
      cache?: CacheService;
    } = {},
  ) {
    return new DashboardService(
      overrides.dashboardRepository ?? createFakeDashboardRepository(),
      overrides.auditRepository ?? createFakeAuditRepository(),
      overrides.orderRepository ?? createFakeOrderRepository(),
      overrides.inventoryService ?? createFakeInventoryService(),
      overrides.invoiceRepository ?? createFakeInvoiceRepository(),
      overrides.leadRepository ?? createFakeLeadRepository(),
      overrides.followUpRepository ?? createFakeFollowUpRepository(),
      overrides.productRepository ?? createFakeProductRepository(),
      createFakePerformanceLogger(),
      // Phase 10, Module 8 (Caching) — a real, fresh-per-call
      // `CacheService`, not a mock: its own local `Map` (see that
      // class's own comment) makes it cheap and safe to construct fresh
      // per test, and the caching tests below need the real
      // get/set/TTL behavior.
      overrides.cache ?? new CacheService(new InMemoryCacheStore(), new MetricsService()),
    );
  }

  describe('getKpis()', () => {
    it('rejects an unknown module', async () => {
      const service = createService();

      await expect(service.getKpis('unknown', TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('returns Orders metrics: revenue, order count, average order value', async () => {
      const service = createService();

      const result = await service.getKpis('orders', TENANT_ID);

      expect(result.module).toBe('orders');
      expect(result.metrics).toEqual({ orderCount: 5, revenue: '1000', averageOrderValue: '200' });
    });

    it('returns Inventory metrics: stock valuation, low stock items', async () => {
      const inventoryService = createFakeInventoryService({
        getLowStockItems: jest.fn(async () => [{}, {}]),
      });
      const service = createService({ inventoryService });

      const result = await service.getKpis('inventory', TENANT_ID);

      expect(result.metrics).toEqual({ itemCount: 3, valuation: '500', lowStockCount: 2 });
    });

    it('returns CRM metrics: lead conversion rate, active follow-ups', async () => {
      const leadRepository = createFakeLeadRepository({
        count: jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(4),
      });
      const service = createService({ leadRepository });

      const result = await service.getKpis('crm', TENANT_ID);

      expect(result.metrics).toEqual({
        totalLeads: 10,
        convertedLeads: 4,
        conversionRate: '40.00',
        activeFollowUps: 4,
      });
    });

    it('reports a zero conversion rate rather than dividing by zero when there are no leads', async () => {
      const leadRepository = createFakeLeadRepository({ count: jest.fn(async () => 0) });
      const service = createService({ leadRepository });

      const result = await service.getKpis('crm', TENANT_ID);

      expect(result.metrics.conversionRate).toBe('0.00');
    });

    it('returns Billing metrics: outstanding invoices, collection rate', async () => {
      const service = createService();

      const result = await service.getKpis('billing', TENANT_ID);

      expect(result.metrics).toEqual({
        outstandingCount: 2,
        outstandingAmount: '300',
        billedAmount: '1000',
        collectedAmount: '700',
        collectionRate: '70',
      });
    });

    it('returns Catalog metrics: published product count', async () => {
      const service = createService();

      const result = await service.getKpis('catalog', TENANT_ID);

      expect(result.metrics).toEqual({ publishedProductCount: 7 });
    });
  });

  describe('overview()', () => {
    it('aggregates all five modules, the active widget set, and a 24h system-error count', async () => {
      const dashboardRepository = createFakeDashboardRepository({
        findActiveWidgets: jest.fn(async () => [
          { key: 'revenue', title: 'Revenue', type: 'KPI', config: {}, sortOrder: 0 },
        ]),
      });
      const auditRepository = createFakeAuditRepository({
        countSystemEventsBySeverity: jest.fn(async () => 3),
      });
      const service = createService({ dashboardRepository, auditRepository });

      const result = await service.overview(TENANT_ID);

      expect(result.modules.map((m) => m.module)).toEqual([
        'orders',
        'inventory',
        'billing',
        'crm',
        'catalog',
      ]);
      expect(result.widgets).toEqual([
        { key: 'revenue', title: 'Revenue', type: 'KPI', config: {}, sortOrder: 0 },
      ]);
      expect(result.systemErrorCount24h).toBe(3);
    });

    // Phase 10, Module 8 (Caching).
    describe('caching', () => {
      it('does not re-aggregate for a second overview() call with the same tenant/date-range', async () => {
        const auditRepository = createFakeAuditRepository();
        const cache = new CacheService(new InMemoryCacheStore(), new MetricsService());
        const service = createService({ auditRepository, cache });

        await service.overview(TENANT_ID);
        await service.overview(TENANT_ID);

        expect(auditRepository.countSystemEventsBySeverity).toHaveBeenCalledTimes(1);
      });

      it('re-aggregates for a different tenant, even with the same date range', async () => {
        const auditRepository = createFakeAuditRepository();
        const cache = new CacheService(new InMemoryCacheStore(), new MetricsService());
        const service = createService({ auditRepository, cache });

        await service.overview(TENANT_ID);
        await service.overview('00000000-0000-7000-8000-000000000099');

        expect(auditRepository.countSystemEventsBySeverity).toHaveBeenCalledTimes(2);
      });

      it('re-aggregates for a different date range, even for the same tenant', async () => {
        const auditRepository = createFakeAuditRepository();
        const cache = new CacheService(new InMemoryCacheStore(), new MetricsService());
        const service = createService({ auditRepository, cache });

        await service.overview(TENANT_ID);
        await service.overview(TENANT_ID, new Date('2026-01-01'), new Date('2026-01-31'));

        expect(auditRepository.countSystemEventsBySeverity).toHaveBeenCalledTimes(2);
      });
    });
  });
});
