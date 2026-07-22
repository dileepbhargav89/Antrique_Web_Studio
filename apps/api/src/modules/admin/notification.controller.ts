import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NOTIFICATION_ROUTE } from './constants/admin.constant';
import { NotificationService } from './notification.service';
import { NotificationListQueryDto } from './dto/notification-list-query.dto';
import { RetryNotificationDto } from './dto/retry-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PERMISSION } from '../auth/constants/permission.constant';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

// This milestone's own "Notifications" Controllers list, read literally:
// "List, Get, Retry placeholder" — three routes, all gated under the
// same `notifications:manage` tier (this milestone's own "Manager, Admin,
// Super Admin" RBAC tier — see permission.constant.ts's own comment for
// why this is a NEW key, not the pre-existing, differently-scoped
// `notifications:read`). Create/Queue/Mark sent/Mark failed have no
// route here at all — see notification.service.ts's own header comment.
@ApiTags('Notification')
@ApiBearerAuth('bearer')
@Controller(NOTIFICATION_ROUTE)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.NOTIFICATIONS_MANAGE)
  @ApiOperation({
    summary:
      'List notifications, admin-wide across all recipients (paginated, filterable, sortable)',
  })
  @ApiPaginatedResponse(NotificationResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: NotificationListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<NotificationResponseDto>> {
    return this.notificationService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.NOTIFICATIONS_MANAGE)
  @ApiOperation({ summary: 'Get a notification by id' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('notification')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.findById(id, tenant.tenantId);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.NOTIFICATIONS_MANAGE)
  @ApiOperation({
    summary: 'Retry a failed notification',
    description: 'Only notifications in FAILED status can be retried.',
  })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('notification')
  retry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetryNotificationDto,
    @Tenant() tenant: TenantContext,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.retry(id, tenant.tenantId, dto.note);
  }
}
