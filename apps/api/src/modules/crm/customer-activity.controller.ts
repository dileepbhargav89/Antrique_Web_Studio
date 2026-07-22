import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CUSTOMER_ACTIVITY_ROUTE } from './constants/crm.constant';
import { CustomerActivityService } from './customer-activity.service';
import { CustomerActivityListQueryDto } from './dto/customer-activity-list-query.dto';
import { CustomerActivityTimelineQueryDto } from './dto/customer-activity-timeline-query.dto';
import { CustomerActivityResponseDto } from './dto/customer-activity-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PERMISSION } from '../auth/constants/permission.constant';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

// This milestone's own "Activities" Controllers list: "Timeline, List" —
// no Create/Update/Delete route; every row is written internally by
// LeadService/FollowUpService (see CustomerActivityRepository's own
// header comment). `GET /customer-activities/timeline` is declared
// AHEAD of any `:id`-shaped route the same way Milestone 7's own `GET
// /inventory/transactions` had to be — this controller has no `:id`
// route at all, but the ordering discipline is kept regardless in case
// one is ever added.
@ApiTags('Customer Activity')
@ApiBearerAuth('bearer')
@Controller(CUSTOMER_ACTIVITY_ROUTE)
export class CustomerActivityController {
  constructor(private readonly customerActivityService: CustomerActivityService) {}

  @Get('timeline')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_ACTIVITIES_READ)
  @ApiOperation({
    summary:
      "Get a customer's activity timeline (not paginated — returns the full, chronological event list)",
  })
  @ApiOkResponse({ type: CustomerActivityResponseDto, isArray: true })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  timeline(
    @Query() query: CustomerActivityTimelineQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CustomerActivityResponseDto[]> {
    return this.customerActivityService.timeline(query, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CUSTOMER_ACTIVITIES_READ)
  @ApiOperation({ summary: 'List customer activities (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(CustomerActivityResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: CustomerActivityListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<CustomerActivityResponseDto>> {
    return this.customerActivityService.list(query, tenant.tenantId);
  }
}
