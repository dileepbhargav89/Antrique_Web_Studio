import { IsDateString, IsOptional } from 'class-validator';

// Query DTO for GET /dashboard/kpis/:module and GET /dashboard/overview
// — "Date range" (this milestone's own shared Filtering list); `module`
// itself is a path param, validated against DASHBOARD_KPI_MODULES by
// the service (an allowlist, not raw client input — same discipline
// every other module's own *_SORT_FIELDS allowlist uses).
export class DashboardKpiQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
