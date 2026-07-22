import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { REPORT_ROUTE } from './constants/admin.constant';
import { ReportingService } from './reporting.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportListQueryDto } from './dto/report-list-query.dto';
import { ReportResponseDto } from './dto/report-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PERMISSION } from '../auth/constants/permission.constant';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

// This milestone's own "Reports" Controllers list: "Generate, List,
// Download metadata" — three routes. `generatedByUserId` is left unset
// on generate() — same known, accepted gap as `createdBy`/`updatedBy`/
// `deletedBy` everywhere else in this codebase (`RequestUser` is
// `{ email }` only, no `userId` in the request pipeline to populate it
// with — see customer-note.service.ts's own identical comment).
@ApiTags('Report')
@ApiBearerAuth('bearer')
@Controller(REPORT_ROUTE)
export class ReportController {
  constructor(private readonly reportingService: ReportingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.REPORTS_WRITE)
  @ApiOperation({
    summary: 'Generate a report',
    description:
      'Computes and stores a snapshot immediately (synchronous) — reuses the same KPI ' +
      'calculations as the dashboard overview, never a second, duplicate aggregation.',
  })
  @ApiCreatedResponse({ type: ReportResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  generate(
    @Body() dto: GenerateReportDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ReportResponseDto> {
    return this.reportingService.generate(
      dto.type,
      tenant.tenantId,
      undefined,
      dto.dateFrom ? new Date(dto.dateFrom) : undefined,
      dto.dateTo ? new Date(dto.dateTo) : undefined,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.REPORTS_READ)
  @ApiOperation({ summary: 'List generated reports (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(ReportResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: ReportListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<ReportResponseDto>> {
    return this.reportingService.list(query, tenant.tenantId);
  }

  // "Download metadata" — returns the stored `result` JSON snapshot, not
  // a file (see reporting.service.ts's own comment).
  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.REPORTS_READ)
  @ApiOperation({
    summary: 'Get a report by id',
    description: 'Returns the stored result snapshot as JSON — not a file download.',
  })
  @ApiOkResponse({ type: ReportResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('report')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<ReportResponseDto> {
    return this.reportingService.findById(id, tenant.tenantId);
  }
}
