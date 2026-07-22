import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ReportType } from '../../../../generated/prisma/enums';

// Request DTO for POST /reports — "Generate," this milestone's own
// explicit entry point. `dateFrom`/`dateTo` scope the underlying
// aggregate query (reused from the same repository methods
// DashboardService's own KPI endpoint calls — "Never duplicate
// calculations already available elsewhere," this milestone's own
// explicit instruction).
export class GenerateReportDto {
  @IsEnum(ReportType)
  type!: ReportType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
