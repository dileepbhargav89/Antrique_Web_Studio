import { BadRequestException, Injectable } from '@nestjs/common';
import { DashboardRepository } from './repositories/dashboard.repository';
import { AuditRepository } from './repositories/audit.repository';
import { OrderRepository } from '../orders/repositories/order.repository';
import { InventoryService } from '../inventory/inventory.service';
import { InvoiceRepository } from '../billing/repositories/invoice.repository';
import { LeadRepository } from '../crm/repositories/lead.repository';
import { FollowUpRepository } from '../crm/repositories/follow-up.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { DashboardKpiResponseDto } from './dto/dashboard-kpi-response.dto';
import { DashboardOverviewResponseDto } from './dto/dashboard-overview-response.dto';
import { DASHBOARD_KPI_MODULES } from './constants/admin.constant';
import {
  LeadStatus,
  FollowUpStatus,
  ProductStatus,
  SystemEventSeverity,
} from '../../../generated/prisma/enums';
import { PerformanceLogger } from '../../logging';
import { CacheService } from '../../cache/cache.service';

export type DashboardKpiModule = (typeof DASHBOARD_KPI_MODULES)[number];

// Phase 10, Module 8 (Caching) — `overview()` is this codebase's own
// heaviest service-layer operation (see that method's own comment,
// unchanged); a 60s cache — the same order of magnitude
// `AuthorizationService`'s role cache and `TenantResolver`'s own new
// tenant-resolution cache both use — turns repeated dashboard views
// (an admin refreshing the page, or several admins looking at the same
// tenant) from N full aggregations into 1 every 60s. Tenant-scoped AND
// date-range-scoped in the cache key (see `overview()` itself) — a
// custom `dateFrom`/`dateTo` query never collides with, or serves stale
// data for, the default (no-range) view.
const DASHBOARD_OVERVIEW_CACHE_TTL_MS = 60_000;

// Business logic + cross-module aggregation. This milestone's own
// "Dashboard" business responsibilities live here, one private method
// per aggregated module — each reaches ONLY the already-exported
// artifact of its source module (a repository where that's what's
// exported — OrderRepository/InvoiceRepository/LeadRepository/
// FollowUpRepository/ProductRepository — a service where only the
// service is exported — InventoryService — see each source module's own
// updated `exports` comment). No new cross-module surface was opened
// beyond what each module's own Milestone 11 export change already
// added.
//
// `catalog` is a 5th aggregated module beyond this milestone's own
// explicitly-named four ("Orders/Inventory/CRM/Billing" analytics) —
// added because `DASHBOARD_KPI_MODULES` (this module's own constant)
// already names it as a valid `GET /dashboard/kpis/:module` value; a
// named-but-unimplemented module would be the same "dead capability"
// mistake this codebase's own established discipline rejects elsewhere
// (see CustomerTagController's/ReportRepository's own header comments).
// Its one metric — published product count — reuses `ProductRepository`
// (already exported by `CatalogModule` since Milestone 6), no new method
// needed.
@Injectable()
export class DashboardService {
  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly auditRepository: AuditRepository,
    private readonly orderRepository: OrderRepository,
    private readonly inventoryService: InventoryService,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly leadRepository: LeadRepository,
    private readonly followUpRepository: FollowUpRepository,
    private readonly productRepository: ProductRepository,
    private readonly performanceLogger: PerformanceLogger,
    private readonly cache: CacheService,
  ) {}

  async getKpis(
    module: string,
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<DashboardKpiResponseDto> {
    if (!(DASHBOARD_KPI_MODULES as readonly string[]).includes(module)) {
      throw new BadRequestException(
        `Unknown dashboard module "${module}". Valid modules: ${DASHBOARD_KPI_MODULES.join(', ')}`,
      );
    }
    const metrics = await this.computeMetrics(
      module as DashboardKpiModule,
      tenantId,
      dateFrom,
      dateTo,
    );
    return new DashboardKpiResponseDto(module, metrics);
  }

  // "Dashboard Overview" — one KPI summary per aggregated module, plus
  // the tenant's own active widget configuration. Wrapped in
  // `PerformanceLogger.measureAsync()` (Milestone 12 — Performance
  // Engineering's own "service duration" instrumentation) — this is the
  // single heaviest service-layer operation in this codebase (5
  // module-KPI computations + the widget read + the system-health count,
  // all run concurrently below, but still the widest fan-out any one
  // request in this API triggers), and `PerformanceLogger` itself
  // (`logging/performance-logger.service.ts`, built Phase 1.2C.7) had NO
  // real call site anywhere until this milestone — this is that first
  // one.
  async overview(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<DashboardOverviewResponseDto> {
    // Phase 10, Module 8 (Caching) — the cache wraps the
    // `PerformanceLogger` timing, not the other way around: a cache HIT
    // legitimately did no real aggregation work, so no
    // "DashboardService.overview" duration log fires for it — only a
    // genuine computation (a miss) gets timed, which is what that log
    // line is actually meant to measure.
    const cacheKey = `dashboard-overview:${tenantId}:${dateFrom?.toISOString() ?? 'none'}:${dateTo?.toISOString() ?? 'none'}`;
    return this.cache.getOrLoad(cacheKey, DASHBOARD_OVERVIEW_CACHE_TTL_MS, () =>
      this.performanceLogger.measureAsync(
        'DashboardService.overview',
        async () => {
          const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const [modules, widgets, systemErrorCount24h] = await Promise.all([
            Promise.all(
              DASHBOARD_KPI_MODULES.map(async (module) => {
                const metrics = await this.computeMetrics(module, tenantId, dateFrom, dateTo);
                return new DashboardKpiResponseDto(module, metrics);
              }),
            ),
            this.dashboardRepository.findActiveWidgets(tenantId),
            this.auditRepository.countSystemEventsBySeverity(
              tenantId,
              SystemEventSeverity.ERROR,
              since24h,
            ),
          ]);

          return new DashboardOverviewResponseDto(
            modules,
            widgets.map((w) => ({
              key: w.key,
              title: w.title,
              type: w.type,
              config: w.config,
              sortOrder: w.sortOrder,
            })),
            systemErrorCount24h,
          );
        },
        { category: 'service', metadata: { tenantId } },
      ),
    );
  }

  private async computeMetrics(
    module: DashboardKpiModule,
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Record<string, string | number>> {
    switch (module) {
      case 'orders':
        return this.getOrdersMetrics(tenantId, dateFrom, dateTo);
      case 'inventory':
        return this.getInventoryMetrics(tenantId);
      case 'crm':
        return this.getCrmMetrics(tenantId);
      case 'billing':
        return this.getBillingMetrics(tenantId, dateFrom, dateTo);
      case 'catalog':
        return this.getCatalogMetrics(tenantId);
    }
  }

  // "Orders: Revenue, Order count, Average order value."
  private async getOrdersMetrics(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Record<string, string | number>> {
    const summary = await this.orderRepository.getRevenueSummary(tenantId, dateFrom, dateTo);
    return {
      orderCount: summary.orderCount,
      revenue: summary.revenue.toString(),
      averageOrderValue: summary.averageOrderValue.toString(),
    };
  }

  // "Inventory: Stock valuation, Low stock items."
  private async getInventoryMetrics(tenantId: string): Promise<Record<string, string | number>> {
    const [valuation, lowStock] = await Promise.all([
      this.inventoryService.getStockValuation(tenantId),
      this.inventoryService.getLowStockItems(tenantId),
    ]);
    return {
      itemCount: valuation.itemCount,
      valuation: valuation.valuation.toString(),
      lowStockCount: lowStock.length,
    };
  }

  // "CRM: Lead conversion, Active follow-ups." Both plain `count()`
  // calls on the exported repositories — no new aggregate method needed
  // on either (see CrmModule's own updated `exports` comment).
  private async getCrmMetrics(tenantId: string): Promise<Record<string, string | number>> {
    const [totalLeads, convertedLeads, activeFollowUps] = await Promise.all([
      this.leadRepository.count({ where: { tenantId, deletedAt: null } }),
      this.leadRepository.count({
        where: { tenantId, deletedAt: null, status: LeadStatus.CONVERTED },
      }),
      this.followUpRepository.count({
        where: { tenantId, deletedAt: null, status: FollowUpStatus.PENDING },
      }),
    ]);
    const conversionRate =
      totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : '0.00';
    return { totalLeads, convertedLeads, conversionRate, activeFollowUps };
  }

  // "Billing: Outstanding invoices, Collection rate."
  private async getBillingMetrics(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Record<string, string | number>> {
    const [outstanding, collection] = await Promise.all([
      this.invoiceRepository.getOutstandingSummary(tenantId),
      this.invoiceRepository.getCollectionSummary(tenantId, dateFrom, dateTo),
    ]);
    return {
      outstandingCount: outstanding.count,
      outstandingAmount: outstanding.outstandingAmount.toString(),
      billedAmount: collection.totalAmount.toString(),
      collectedAmount: collection.amountPaid.toString(),
      collectionRate: collection.collectionRate.toString(),
    };
  }

  private async getCatalogMetrics(tenantId: string): Promise<Record<string, string | number>> {
    const publishedProductCount = await this.productRepository.count({
      where: { tenantId, deletedAt: null, status: ProductStatus.PUBLISHED },
    });
    return { publishedProductCount };
  }
}
