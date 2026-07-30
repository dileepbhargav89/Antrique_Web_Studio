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
import { PROJECT_ROUTE } from './constants/projects.constant';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectListQueryDto } from './dto/project-list-query.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { ProjectDetailResponseDto } from './dto/project-detail-response.dto';
import { ProjectMemberResponseDto } from './dto/project-member-response.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ActivityLogResponseDto } from './dto/activity-log-response.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
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
  ApiConflictError,
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

// Create/List/Get/Update/Archive/Members — Archive is gated by
// `projects:delete` (Admin/Super Admin only), stricter than the
// `projects:write` every other write route here uses, same
// Update-vs-terminal-action split LeadController establishes.
@ApiTags('Project')
@ApiBearerAuth('bearer')
@Controller(PROJECT_ROUTE)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Create a project' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateProjectDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProjectResponseDto> {
    return this.projectService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_READ)
  @ApiOperation({ summary: 'List projects (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(ProjectResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: ProjectListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<ProjectResponseDto>> {
    return this.projectService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_READ)
  @ApiOperation({ summary: 'Get a project overview (completion %, members)' })
  @ApiOkResponse({ type: ProjectDetailResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('project')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<ProjectDetailResponseDto> {
    return this.projectService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_WRITE)
  @ApiOperation({
    summary: 'Update a project (DRAFT/ACTIVE/IN_REVIEW/LAUNCHED/MAINTENANCE only)',
  })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('project')
  @ApiConflictError('An archived project cannot be updated.')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProjectResponseDto> {
    return this.projectService.update(id, dto, tenant.tenantId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_DELETE)
  @ApiOperation({ summary: 'Archive a project (terminal)' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('project')
  @ApiConflictError('Project is already archived.')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<ProjectResponseDto> {
    return this.projectService.archive(id, tenant.tenantId);
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Add a member to a project' })
  @ApiCreatedResponse({ type: ProjectMemberResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('project')
  @ApiConflictError('User is already a member of this project.')
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddProjectMemberDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProjectMemberResponseDto> {
    return this.projectService.addMember(id, dto, tenant.tenantId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_WRITE)
  @ApiOperation({ summary: 'Remove a member from a project' })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('project or member')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Tenant() tenant: TenantContext,
  ): Promise<void> {
    return this.projectService.removeMember(id, userId, tenant.tenantId);
  }

  @Get(':id/activity')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROJECTS_READ)
  @ApiOperation({ summary: "List a project's activity timeline (paginated, newest first)" })
  @ApiPaginatedResponse(ActivityLogResponseDto)
  @ApiStandardAuthErrors()
  @ApiNotFoundError('project')
  listActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<ActivityLogResponseDto>> {
    return this.projectService.listActivity(
      id,
      tenant.tenantId,
      query.page ?? 1,
      query.limit ?? 20,
    );
  }
}
