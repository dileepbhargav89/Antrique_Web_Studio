import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PROJECT_ROUTE } from './constants/projects.constant';
import { DocumentService } from './document.service';
import { DocumentResponseDto } from './dto/document-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PERMISSION } from '../auth/constants/permission.constant';
import {
  ApiNotFoundError,
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

// Nested under PROJECT_ROUTE — see projects.constant.ts's own comment.
// Mirrors ProductImageController's shape exactly (memoryStorage() so
// `file.buffer` is populated for StorageService.upload() to read
// directly, no local-disk write).
@ApiTags('Project')
@ApiBearerAuth('bearer')
@Controller(PROJECT_ROUTE)
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post(':id/documents')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.DOCUMENTS_WRITE)
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
    summary: 'Upload a project file',
    description: `Multipart upload, field name "file", max ${MAX_DOCUMENT_BYTES / (1024 * 1024)}MB.`,
  })
  @ApiCreatedResponse({ type: DocumentResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('project')
  async upload(
    @Param('id', ParseUUIDPipe) projectId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_DOCUMENT_BYTES })],
      }),
    )
    file: Express.Multer.File,
    @Tenant() tenant: TenantContext,
  ): Promise<DocumentResponseDto> {
    return this.documentService.upload(
      projectId,
      { buffer: file.buffer, mimeType: file.mimetype, originalName: file.originalname },
      tenant.tenantId,
    );
  }

  @Get(':id/documents')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.DOCUMENTS_READ)
  @ApiOperation({ summary: 'List a project’s files' })
  @ApiOkResponse({ type: DocumentResponseDto, isArray: true })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('project')
  list(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Tenant() tenant: TenantContext,
  ): Promise<DocumentResponseDto[]> {
    return this.documentService.list(projectId, tenant.tenantId);
  }

  @Delete(':id/documents/:documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.DOCUMENTS_WRITE)
  @ApiOperation({ summary: 'Remove a project file' })
  @ApiStandardAuthErrors()
  @ApiNotFoundError('document')
  remove(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Tenant() tenant: TenantContext,
  ): Promise<void> {
    return this.documentService.remove(projectId, documentId, tenant.tenantId);
  }
}
