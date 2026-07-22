import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { DASHBOARD_ROUTE } from './constants/admin.constant';
import { DashboardService } from './dashboard.service';
import { DashboardKpiQueryDto } from './dto/dashboard-kpi-query.dto';
import { DashboardKpiResponseDto } from './dto/dashboard-kpi-response.dto';
import { DashboardOverviewResponseDto } from './dto/dashboard-overview-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PERMISSION } from '../auth/constants/permission.constant';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';

// This milestone's own "Dashboard" Controllers responsibilities:
// "Overview" and per-module "KPI endpoints" — both gated under
// `dashboard:read`, this milestone's own explicit "Manager, Admin, Super
// Admin" tier.
@ApiTags('Dashboard')
@ApiBearerAuth('bearer')
@Controller(DASHBOARD_ROUTE)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.DASHBOARD_READ)
  @ApiOperation({
    summary:
      'Get the admin dashboard overview — one KPI summary per module (Orders/Inventory/Billing/CRM/Catalog)',
  })
  @ApiOkResponse({ type: DashboardOverviewResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  overview(
    @Query() query: DashboardKpiQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<DashboardOverviewResponseDto> {
    return this.dashboardService.overview(
      tenant.tenantId,
      query.dateFrom ? new Date(query.dateFrom) : undefined,
      query.dateTo ? new Date(query.dateTo) : undefined,
    );
  }

  @Get('kpis/:module')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.DASHBOARD_READ)
  @ApiOperation({
    summary: 'Get KPIs for one dashboard module',
    description: '`module` must be one of: orders, inventory, billing, crm, catalog.',
  })
  @ApiOkResponse({ type: DashboardKpiResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  kpis(
    @Param('module') module: string,
    @Query() query: DashboardKpiQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<DashboardKpiResponseDto> {
    return this.dashboardService.getKpis(
      module,
      tenant.tenantId,
      query.dateFrom ? new Date(query.dateFrom) : undefined,
      query.dateTo ? new Date(query.dateTo) : undefined,
    );
  }
}
