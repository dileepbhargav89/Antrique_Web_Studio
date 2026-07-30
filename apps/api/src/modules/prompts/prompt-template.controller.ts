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
import { PROMPT_TEMPLATE_ROUTE } from './constants/prompts.constant';
import { PromptTemplateService } from './prompt-template.service';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';
import { PromptTemplateListQueryDto } from './dto/prompt-template-list-query.dto';
import { PromptTemplateResponseDto } from './dto/prompt-template-response.dto';
import { RenderPromptTemplateDto } from './dto/render-prompt-template.dto';
import { TestPromptTemplateDto } from './dto/test-prompt-template.dto';
import { PromptRenderResponseDto } from './dto/prompt-render-response.dto';
import { PromptTestResponseDto } from './dto/prompt-test-response.dto';
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

// Create/List/Get/Update/Render/Test — no Delete (deactivation via the
// ordinary update route's `isActive` field, no `prompt_templates:delete`
// permission is seeded — same shape ClientController already follows).
// `render`/`test` are gated under `:write`, not `:read` — render still
// has no external side effect, but grouping it with `test` (a real,
// costed AI call) under the stricter tier is a deliberate, conservative
// default for a brand-new capability; revisit if a genuine read-only
// preview consumer needs it.
@ApiTags('Prompt Template')
@ApiBearerAuth('bearer')
@Controller(PROMPT_TEMPLATE_ROUTE)
export class PromptTemplateController {
  constructor(private readonly promptTemplateService: PromptTemplateService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Create a prompt template' })
  @ApiCreatedResponse({ type: PromptTemplateResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiConflictError('A prompt template with this key already exists.')
  create(
    @Body() dto: CreatePromptTemplateDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PromptTemplateResponseDto> {
    return this.promptTemplateService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_READ)
  @ApiOperation({ summary: 'List prompt templates (paginated, filterable, sortable)' })
  @ApiPaginatedResponse(PromptTemplateResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: PromptTemplateListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<PromptTemplateResponseDto>> {
    return this.promptTemplateService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_READ)
  @ApiOperation({ summary: 'Get a prompt template by id' })
  @ApiOkResponse({ type: PromptTemplateResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('prompt template')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<PromptTemplateResponseDto> {
    return this.promptTemplateService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_WRITE)
  @ApiOperation({ summary: 'Update a prompt template, including isActive' })
  @ApiOkResponse({ type: PromptTemplateResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('prompt template')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromptTemplateDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PromptTemplateResponseDto> {
    return this.promptTemplateService.update(id, dto, tenant.tenantId);
  }

  @Post(':id/render')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_WRITE)
  @ApiOperation({
    summary: 'Render a template with variables — no AI call, pure string interpolation',
  })
  @ApiOkResponse({ type: PromptRenderResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('prompt template')
  render(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenderPromptTemplateDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PromptRenderResponseDto> {
    return this.promptTemplateService.render(id, dto.variables, tenant.tenantId);
  }

  @Post(':id/test')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_WRITE)
  @ApiOperation({
    summary: 'Render a template and run it against a real AI provider',
    description:
      'Real external call — real latency, real cost. Proves the Step 1 (provider abstraction) + ' +
      'Step 2 (prompt library) integration end-to-end; not a preview action.',
  })
  @ApiOkResponse({ type: PromptTestResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('prompt template')
  test(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestPromptTemplateDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PromptTestResponseDto> {
    return this.promptTemplateService.test(id, dto.variables, tenant.tenantId, {
      provider: dto.provider,
      maxTokens: dto.maxTokens,
      temperature: dto.temperature,
    });
  }
}
