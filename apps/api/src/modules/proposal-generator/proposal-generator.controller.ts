import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PROPOSAL_GENERATOR_ROUTE } from './constants/proposal-generator.constant';
import { ProposalGeneratorService } from './proposal-generator.service';
import { GenerateProposalDto } from './dto/generate-proposal.dto';
import { ProposalDraftResponseDto } from './dto/proposal-draft-response.dto';
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

// Gated under `quotations:write` — deliberately NOT a new AI-specific
// permission. Generating a proposal draft is the same business action
// (drafting a proposal for a lead/client) `POST /quotations` already
// requires that permission for; AI is how it's drafted, not a different
// capability tier. Same "AI enhances the existing workflow, doesn't
// bypass its access control" reasoning the Phase 8 brief's own "Respect
// existing RBAC" rule asks for.
@ApiTags('Proposal Generator')
@ApiBearerAuth('bearer')
@Controller(PROPOSAL_GENERATOR_ROUTE)
export class ProposalGeneratorController {
  constructor(private readonly proposalGeneratorService: ProposalGeneratorService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.QUOTATIONS_WRITE)
  @ApiOperation({
    summary: 'Generate an AI proposal draft for a lead or client (exactly one of clientId/leadId)',
    description:
      'Real external AI call — real latency, real cost. Writes nothing to the database; the ' +
      'response is a draft for a human to review and use when creating a real Quotation through ' +
      'the existing POST /quotations route.',
  })
  @ApiCreatedResponse({ type: ProposalDraftResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  generate(
    @Body() dto: GenerateProposalDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ProposalDraftResponseDto> {
    return this.proposalGeneratorService.generate(dto, tenant.tenantId);
  }
}
