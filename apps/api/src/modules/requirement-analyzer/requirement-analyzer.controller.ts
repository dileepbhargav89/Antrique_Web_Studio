import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  REQUIREMENT_ANALYZER_ROUTE,
  MAX_DOCUMENT_BYTES,
  SUPPORTED_DOCUMENT_EXTENSIONS,
} from './constants/requirement-analyzer.constant';
import { RequirementAnalyzerService } from './requirement-analyzer.service';
import { RequirementAnalysisResponseDto } from './dto/requirement-analysis-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PERMISSION } from '../auth/constants/permission.constant';
import {
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';

// Gated under `prompt_templates:write` — same tier as Prompt Library's
// own `test` action (real, costed AI call), not a new AI-specific
// permission. No lead/client link — unlike Step 3 (Proposal Generator),
// this step's own brief has no "which lead/client is this for" input, so
// there's nothing to XOR-validate here.
//
// File-type validation is by EXTENSION (see DocumentTextExtractor), not
// by the browser-supplied Content-Type — MIME sniffing for `.md` in
// particular is unreliable across clients/browsers (often arrives as
// `application/octet-stream` or `text/plain`), so `ParseFilePipe`'s own
// `FileTypeValidator` (MIME-based) isn't used here; only size is
// pipe-validated, type is checked once the real filename is available.
@ApiTags('Requirement Analyzer')
@ApiBearerAuth('bearer')
@Controller(REQUIREMENT_ANALYZER_ROUTE)
export class RequirementAnalyzerController {
  constructor(private readonly requirementAnalyzerService: RequirementAnalyzerService) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PROMPT_TEMPLATES_WRITE)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Analyze a requirements document (PDF/DOCX/MD/TXT) with AI',
    description:
      `Multipart upload, field name "file", max ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB, ` +
      `one of ${SUPPORTED_DOCUMENT_EXTENSIONS.join(', ')}. Real external AI call — real latency, ` +
      'real cost. The uploaded file is stored via the existing StorageService; nothing else is ' +
      'persisted — the analysis is a draft for human review.',
  })
  @ApiCreatedResponse({ type: RequirementAnalysisResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  async analyze(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_DOCUMENT_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Tenant() tenant: TenantContext,
  ): Promise<RequirementAnalysisResponseDto> {
    return this.requirementAnalyzerService.analyze(
      { buffer: file.buffer, mimeType: file.mimetype, originalName: file.originalname },
      tenant.tenantId,
    );
  }
}
