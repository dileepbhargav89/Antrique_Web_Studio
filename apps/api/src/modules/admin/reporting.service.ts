import { Injectable, NotFoundException } from '@nestjs/common';
import { ReportRepository } from './repositories/report.repository';
import { DashboardService, DashboardKpiModule } from './dashboard.service';
import { ReportListQueryDto } from './dto/report-list-query.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { toReportResponseDto } from './mappers/report.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { ReportType, Prisma } from '../../../generated/prisma/client';

// Maps each named `ReportType` to the `DashboardService` module it
// summarizes — "Never duplicate calculations already available
// elsewhere" (this milestone's own explicit instruction):
// `ReportingService.generate()` computes its snapshot via the SAME
// `DashboardService.getKpis()` call the `GET /dashboard/kpis/:module`
// route itself uses, not a second, parallel aggregate implementation.
const REPORT_TYPE_TO_MODULE: Record<ReportType, DashboardKpiModule> = {
  SALES_SUMMARY: 'orders',
  INVENTORY_SUMMARY: 'inventory',
  CRM_SUMMARY: 'crm',
  BILLING_SUMMARY: 'billing',
};

// Business logic + repository orchestration + mapping. This milestone's
// own "Reports" business responsibilities:
// - "Generate" — computes a snapshot via `DashboardService`, persists it
//   as an immutable `ScheduledReport` row (`parameters` records what was
//   asked for, `result` is the computed metrics at generation time —
//   see schema.prisma's own comment on this entity).
// - "List" — paginated, filterable by `type`/date range.
// - "Download metadata" — `findById()`; "download" here means returning
//   the already-stored `result` JSON, not producing a file (PDF/CSV
//   generation is out of scope — no "Do NOT Implement" item names it,
//   but nothing in this milestone's brief asks for a file format either,
//   so this stays the same JSON snapshot every other read in this module
//   already returns).
@Injectable()
export class ReportingService {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly dashboardService: DashboardService,
  ) {}

  async generate(
    type: ReportType,
    tenantId: string,
    generatedByUserId?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<ReportResponseDto> {
    const module = REPORT_TYPE_TO_MODULE[type];
    const kpis = await this.dashboardService.getKpis(module, tenantId, dateFrom, dateTo);

    const parameters: Prisma.InputJsonValue = {
      dateFrom: dateFrom?.toISOString() ?? null,
      dateTo: dateTo?.toISOString() ?? null,
    };
    const result: Prisma.InputJsonValue = { module: kpis.module, metrics: kpis.metrics };

    const report = await this.reportRepository.create({
      data: { tenantId, type, parameters, result, generatedByUserId },
    });
    return toReportResponseDto(report);
  }

  async findById(id: string, tenantId: string): Promise<ReportResponseDto> {
    const report = await this.reportRepository.findById(id, tenantId);
    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }
    return toReportResponseDto(report);
  }

  async list(
    query: ReportListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<ReportResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.ScheduledReportWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const { items, total } = await this.reportRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toReportResponseDto), total, page, limit);
  }
}
