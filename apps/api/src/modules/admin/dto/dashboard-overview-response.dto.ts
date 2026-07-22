import { DashboardKpiResponseDto } from './dashboard-kpi-response.dto';

// "Dashboard Overview" — one KPI summary per aggregated module, the
// tenant's own active widget configuration (consumed, not just written —
// see DashboardWidget's own schema.prisma comment), and a lightweight
// system-health signal (`systemErrorCount24h`) — ERROR-severity
// `SystemEvent` rows in the trailing 24 hours, via
// `AuditRepository.countSystemEventsBySeverity()` (that method's own
// comment already names this as its intended consumer).
export class DashboardOverviewResponseDto {
  constructor(
    readonly modules: DashboardKpiResponseDto[],
    readonly widgets: Array<{
      key: string;
      title: string;
      type: string;
      config: unknown;
      sortOrder: number;
    }>,
    readonly systemErrorCount24h: number,
  ) {}
}
