import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TASK_GENERATOR_ROUTE } from './constants/task-generator.constant';
import { TaskGeneratorService } from './task-generator.service';
import { GenerateTasksDto } from './dto/generate-tasks.dto';
import { TaskGenerationResponseDto } from './dto/task-generation-response.dto';
import { ApproveTasksDto } from './dto/approve-tasks.dto';
import { ApproveTasksResponseDto } from './dto/approve-tasks-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PERMISSION } from '../auth/constants/permission.constant';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';

@ApiTags('Task Generator')
@ApiBearerAuth('bearer')
@Controller(TASK_GENERATOR_ROUTE)
export class TaskGeneratorController {
  constructor(private readonly taskGeneratorService: TaskGeneratorService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_WRITE)
  @ApiOperation({
    summary: 'Generate epic/story/task/subtask suggestions from requirements and/or a milestone',
    description:
      'Real external AI call — real latency, real cost. Writes nothing to the database; review ' +
      'the suggestions, then POST the ones you want kept to /task-generator/approve.',
  })
  @ApiCreatedResponse({ type: TaskGenerationResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  generate(
    @Body() dto: GenerateTasksDto,
    @Tenant() tenant: TenantContext,
  ): Promise<TaskGenerationResponseDto> {
    return this.taskGeneratorService.generate(dto, tenant.tenantId);
  }

  // Gated under `tasks:write` (Phase 7's real permission), not
  // `prompt_templates:write` — this route makes no AI call and creates
  // real Task rows, the same action `POST /tasks` already gates under
  // that permission.
  @Post('approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.TASKS_WRITE)
  @ApiOperation({
    summary: 'Create real Task rows from approved suggestions',
    description: 'No AI call — pure persistence, via the existing Task module, unchanged.',
  })
  @ApiCreatedResponse({ type: ApproveTasksResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  approve(
    @Body() dto: ApproveTasksDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ApproveTasksResponseDto> {
    return this.taskGeneratorService.approve(dto, tenant.tenantId);
  }
}
