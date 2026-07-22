import { NotFoundException } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportRepository } from './repositories/report.repository';
import { DashboardService } from './dashboard.service';
import { DashboardKpiResponseDto } from './dto/dashboard-kpi-response.dto';
import { ReportType } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createReportRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'report-1',
    tenantId: TENANT_ID,
    type: ReportType.SALES_SUMMARY,
    parameters: { dateFrom: null, dateTo: null },
    result: { module: 'orders', metrics: { orderCount: 5 } },
    generatedByUserId: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeReportRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: jest.fn(async () => createReportRow()),
    findById: jest.fn(async () => createReportRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    ...overrides,
  } as unknown as ReportRepository;
}

function createFakeDashboardService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getKpis: jest.fn(
      async (module: string) => new DashboardKpiResponseDto(module, { orderCount: 5 }),
    ),
    ...overrides,
  } as unknown as DashboardService;
}

describe('ReportingService', () => {
  function createService(
    overrides: { reportRepository?: ReportRepository; dashboardService?: DashboardService } = {},
  ) {
    return new ReportingService(
      overrides.reportRepository ?? createFakeReportRepository(),
      overrides.dashboardService ?? createFakeDashboardService(),
    );
  }

  describe('generate()', () => {
    it('computes the snapshot via DashboardService, mapped from its own ReportType ("Never duplicate calculations")', async () => {
      const reportRepository = createFakeReportRepository();
      const dashboardService = createFakeDashboardService();
      const service = createService({ reportRepository, dashboardService });

      await service.generate(ReportType.SALES_SUMMARY, TENANT_ID);

      expect(dashboardService.getKpis).toHaveBeenCalledWith(
        'orders',
        TENANT_ID,
        undefined,
        undefined,
      );
      expect(reportRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          type: ReportType.SALES_SUMMARY,
          result: { module: 'orders', metrics: { orderCount: 5 } },
        }),
      });
    });

    it('maps each ReportType to its own DashboardService module', async () => {
      const dashboardService = createFakeDashboardService();
      const service = createService({ dashboardService });

      await service.generate(ReportType.INVENTORY_SUMMARY, TENANT_ID);
      await service.generate(ReportType.CRM_SUMMARY, TENANT_ID);
      await service.generate(ReportType.BILLING_SUMMARY, TENANT_ID);

      expect(dashboardService.getKpis).toHaveBeenNthCalledWith(
        1,
        'inventory',
        TENANT_ID,
        undefined,
        undefined,
      );
      expect(dashboardService.getKpis).toHaveBeenNthCalledWith(
        2,
        'crm',
        TENANT_ID,
        undefined,
        undefined,
      );
      expect(dashboardService.getKpis).toHaveBeenNthCalledWith(
        3,
        'billing',
        TENANT_ID,
        undefined,
        undefined,
      );
    });

    it('persists the requested date range as parameters', async () => {
      const reportRepository = createFakeReportRepository();
      const service = createService({ reportRepository });
      const dateFrom = new Date('2026-01-01T00:00:00.000Z');
      const dateTo = new Date('2026-01-31T23:59:59.000Z');

      await service.generate(ReportType.SALES_SUMMARY, TENANT_ID, undefined, dateFrom, dateTo);

      expect(reportRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parameters: { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() },
        }),
      });
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the report does not exist ("Download metadata")', async () => {
      const reportRepository = createFakeReportRepository({ findById: jest.fn(async () => null) });
      const service = createService({ reportRepository });

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns the stored result snapshot for an existing report', async () => {
      const service = createService();

      const result = await service.findById('report-1', TENANT_ID);

      expect(result.result).toEqual({ module: 'orders', metrics: { orderCount: 5 } });
    });
  });

  describe('list()', () => {
    it('delegates to findManyPaginated() with defaulted pagination/sorting', async () => {
      const reportRepository = createFakeReportRepository();
      const service = createService({ reportRepository });

      await service.list({} as never, TENANT_ID);

      expect(reportRepository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        {},
        { createdAt: 'desc' },
        0,
        20,
      );
    });
  });
});
