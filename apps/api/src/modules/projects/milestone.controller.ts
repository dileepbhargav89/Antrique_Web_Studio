import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MILESTONE_ROUTE } from './constants/projects.constant';
import { MilestoneService } from './milestone.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestoneListQueryDto } from './dto/milestone-list-query.dto';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
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

@ApiTags('Milestone')
@ApiBearerAuth('bearer')
@Controller(MILESTONE_ROUTE)
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MILESTONES_WRITE)
  @ApiOperation({ summary: 'Create a milestone' })
  @ApiCreatedResponse({ type: MilestoneResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateMilestoneDto,
    @Tenant() tenant: TenantContext,
  ): Promise<MilestoneResponseDto> {
    return this.milestoneService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MILESTONES_READ)
  @ApiOperation({ summary: 'List milestones (paginated, filterable by project/status)' })
  @ApiPaginatedResponse(MilestoneResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: MilestoneListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<MilestoneResponseDto>> {
    return this.milestoneService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MILESTONES_READ)
  @ApiOperation({ summary: 'Get a milestone by id' })
  @ApiOkResponse({ type: MilestoneResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('milestone')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<MilestoneResponseDto> {
    return this.milestoneService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.MILESTONES_WRITE)
  @ApiOperation({
    summary:
      'Update a milestone, including status (PENDING/IN_PROGRESS/SUBMITTED/CHANGES_REQUESTED/APPROVED)',
  })
  @ApiOkResponse({ type: MilestoneResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('milestone')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
    @Tenant() tenant: TenantContext,
  ): Promise<MilestoneResponseDto> {
    return this.milestoneService.update(id, dto, tenant.tenantId);
  }
}
