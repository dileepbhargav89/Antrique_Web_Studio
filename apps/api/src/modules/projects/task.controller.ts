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
import { TASK_ROUTE } from './constants/projects.constant';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskListQueryDto } from './dto/task-list-query.dto';
import { TaskResponseDto } from './dto/task-response.dto';
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

// Internal delivery-team tool, not client-facing — see Task's own schema
// comment. `list()`'s filters back both the List view and a client-side
// Kanban board.
@ApiTags('Task')
@ApiBearerAuth('bearer')
@Controller(TASK_ROUTE)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TASKS_WRITE)
  @ApiOperation({ summary: 'Create a task' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(@Body() dto: CreateTaskDto, @Tenant() tenant: TenantContext): Promise<TaskResponseDto> {
    return this.taskService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TASKS_READ)
  @ApiOperation({
    summary: 'List tasks (paginated, filterable by project/milestone/assignee/status/priority)',
  })
  @ApiPaginatedResponse(TaskResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: TaskListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<TaskResponseDto>> {
    return this.taskService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TASKS_READ)
  @ApiOperation({ summary: 'Get a task by id' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('task')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<TaskResponseDto> {
    return this.taskService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TASKS_WRITE)
  @ApiOperation({
    summary: 'Update a task, including status/priority/assignee/milestone',
  })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('task')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @Tenant() tenant: TenantContext,
  ): Promise<TaskResponseDto> {
    return this.taskService.update(id, dto, tenant.tenantId);
  }
}
