import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FOLLOW_UP_ROUTE } from './constants/crm.constant';
import { FollowUpService } from './follow-up.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import { CompleteFollowUpDto } from './dto/complete-follow-up.dto';
import { CancelFollowUpDto } from './dto/cancel-follow-up.dto';
import { FollowUpListQueryDto } from './dto/follow-up-list-query.dto';
import { FollowUpResponseDto } from './dto/follow-up-response.dto';
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
  ApiNoContentResponse,
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

// This milestone's own "Follow-ups" Controllers list: "CRUD, Complete,
// Cancel, Reopen."
@ApiTags('Follow Up')
@ApiBearerAuth('bearer')
@Controller(FOLLOW_UP_ROUTE)
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FOLLOW_UP_TASKS_WRITE)
  @ApiOperation({ summary: 'Create a follow-up task' })
  @ApiCreatedResponse({ type: FollowUpResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateFollowUpDto,
    @Tenant() tenant: TenantContext,
  ): Promise<FollowUpResponseDto> {
    return this.followUpService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FOLLOW_UP_TASKS_READ)
  @ApiOperation({ summary: 'List follow-up tasks (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(FollowUpResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: FollowUpListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<FollowUpResponseDto>> {
    return this.followUpService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FOLLOW_UP_TASKS_READ)
  @ApiOperation({ summary: 'Get a follow-up task by id' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('follow-up task')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<FollowUpResponseDto> {
    return this.followUpService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FOLLOW_UP_TASKS_WRITE)
  @ApiOperation({ summary: 'Update a follow-up task' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('follow-up task')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFollowUpDto,
    @Tenant() tenant: TenantContext,
  ): Promise<FollowUpResponseDto> {
    return this.followUpService.update(id, dto, tenant.tenantId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FOLLOW_UP_TASKS_WRITE)
  @ApiOperation({
    summary: 'Mark a follow-up task complete',
    description:
      "Also records a FOLLOW_UP_COMPLETED entry on the linked customer's activity timeline.",
  })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('follow-up task')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteFollowUpDto,
    @Tenant() tenant: TenantContext,
  ): Promise<FollowUpResponseDto> {
    return this.followUpService.complete(id, dto, tenant.tenantId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FOLLOW_UP_TASKS_WRITE)
  @ApiOperation({ summary: 'Cancel a follow-up task' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('follow-up task')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelFollowUpDto,
    @Tenant() tenant: TenantContext,
  ): Promise<FollowUpResponseDto> {
    return this.followUpService.cancel(id, dto, tenant.tenantId);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FOLLOW_UP_TASKS_WRITE)
  @ApiOperation({ summary: 'Reopen a completed or cancelled follow-up task (back to PENDING)' })
  @ApiOkResponse({ type: FollowUpResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('follow-up task')
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<FollowUpResponseDto> {
    return this.followUpService.reopen(id, tenant.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.FOLLOW_UP_TASKS_DELETE)
  @ApiOperation({ summary: 'Soft-delete a follow-up task' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('follow-up task')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.followUpService.remove(id, tenant.tenantId);
  }
}
