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
import { CONTENT_ASSISTANT_ROUTE } from './constants/content-assistant.constant';
import { ContentAssistantService } from './content-assistant.service';
import { GenerateContentDto } from './dto/generate-content.dto';
import { UpdateContentDraftDto } from './dto/update-content-draft.dto';
import { ContentDraftListQueryDto } from './dto/content-draft-list-query.dto';
import { ContentDraftResponseDto } from './dto/content-draft-response.dto';
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

@ApiTags('Content Assistant')
@ApiBearerAuth('bearer')
@Controller(CONTENT_ASSISTANT_ROUTE)
export class ContentAssistantController {
  constructor(private readonly contentAssistantService: ContentAssistantService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CONTENT_DRAFTS_WRITE)
  @ApiOperation({
    summary:
      'Generate a content draft (case study, service description, blog post, FAQ, landing page, or social post)',
    description:
      'Real external AI call — real latency, real cost. Always persists a ContentDraft row, even if ' +
      "the model's response doesn't parse cleanly (see the service's own comment) — this step's own " +
      'spec requires storing drafts, not just returning them. Never publishes anywhere.',
  })
  @ApiCreatedResponse({ type: ContentDraftResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  generate(
    @Body() dto: GenerateContentDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ContentDraftResponseDto> {
    return this.contentAssistantService.generate(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CONTENT_DRAFTS_READ)
  @ApiOperation({ summary: 'List content drafts (paginated, filterable by type, sortable)' })
  @ApiPaginatedResponse(ContentDraftResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: ContentDraftListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<ContentDraftResponseDto>> {
    return this.contentAssistantService.list(query, tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CONTENT_DRAFTS_READ)
  @ApiOperation({ summary: 'Get a content draft by id' })
  @ApiOkResponse({ type: ContentDraftResponseDto })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('content draft')
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantContext,
  ): Promise<ContentDraftResponseDto> {
    return this.contentAssistantService.findById(id, tenant.tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CONTENT_DRAFTS_WRITE)
  @ApiOperation({ summary: 'Edit a content draft (title/body) — human review, no AI call' })
  @ApiOkResponse({ type: ContentDraftResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('content draft')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDraftDto,
    @Tenant() tenant: TenantContext,
  ): Promise<ContentDraftResponseDto> {
    return this.contentAssistantService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.CONTENT_DRAFTS_DELETE)
  @ApiOperation({ summary: 'Discard a content draft (soft delete, never publishes anywhere)' })
  @ApiNoContentResponse()
  @ApiStandardAuthErrors()
  @ApiNotFoundError('content draft')
  remove(@Param('id', ParseUUIDPipe) id: string, @Tenant() tenant: TenantContext): Promise<void> {
    return this.contentAssistantService.remove(id, tenant.tenantId);
  }
}
