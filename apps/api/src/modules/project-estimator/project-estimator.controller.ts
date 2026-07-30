import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PROJECT_ESTIMATOR_ROUTE } from './constants/project-estimator.constant';
import { ProjectEstimatorService } from './project-estimator.service';
import { EstimateProjectDto } from './dto/estimate-project.dto';
import { ProjectEstimateResponseDto } from './dto/project-estimate-response.dto';
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

// Gated under `prompt_templates:write` — same reasoning as
// RequirementAnalyzerController's own comment: no lead/client/project
// link exists on this endpoint, so there's no existing CRM-workflow
// permission to piggyback on the way Step 3 reused `quotations:write`.
@ApiTags('Project Estimator')
@ApiBearerAuth('bearer')
@Controller(PROJECT_ESTIMATOR_ROUTE)
export class ProjectEstimatorController {
  constructor(private readonly projectEstimatorService: ProjectEstimatorService) {}

  @Post('estimate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_WRITE)
  @ApiOperation({
    summary: 'Estimate hours, sprints, team size, budget, complexity, and dependencies for a scope',
    description:
      'Real external AI call — real latency, real cost. Writes nothing to the database; the ' +
      'response is a draft estimate for human review, including a confidence score.',
  })
  @ApiCreatedResponse({ type: ProjectEstimateResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  estimate(
    @Body() dto: EstimateProjectDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProjectEstimateResponseDto> {
    return this.projectEstimatorService.estimate(dto, tenant.tenantId);
  }
}
