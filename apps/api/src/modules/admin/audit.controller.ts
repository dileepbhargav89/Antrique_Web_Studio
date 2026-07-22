import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AUDIT_LOG_ROUTE } from './constants/admin.constant';
import { AuditService } from './audit.service';
import { AuditLogListQueryDto } from './dto/audit-log-list-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PERMISSION } from '../auth/constants/permission.constant';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

// This milestone's own "Audit" Controllers list: "List, Search" — one
// route, `search` is a query param on the same list endpoint (see
// audit.service.ts's own comment), gated under `audit_logs:read` — this
// milestone's own explicit "Admin, Super Admin" tier (the pre-existing
// Phase 1.1B key, never granted to any other role — zero seed changes
// needed to already match this tier).
@ApiTags('Audit')
@ApiBearerAuth('bearer')
@Controller(AUDIT_LOG_ROUTE)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.AUDIT_LOGS_READ)
  @ApiOperation({
    summary: 'List/search the compliance audit trail (paginated)',
    description: 'Admin/Super Admin only. `search` matches against both action and resource type.',
  })
  @ApiPaginatedResponse(AuditLogResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: AuditLogListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<AuditLogResponseDto>> {
    return this.auditService.list(query, tenant.tenantId);
  }
}
