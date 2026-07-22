import { ScheduledReport } from '../../../../generated/prisma/client';
import { ReportResponseDto } from '../dto/report-response.dto';

export function toReportResponseDto(report: ScheduledReport): ReportResponseDto {
  return new ReportResponseDto(
    report.id,
    report.type,
    report.parameters,
    report.result,
    report.generatedByUserId,
    report.createdAt,
  );
}
