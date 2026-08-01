import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Patch,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SETTINGS_ROUTE } from './settings.constant';
import { SettingsService } from './settings.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { BrandingResponseDto } from './dto/branding-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { TenantContext } from '../types/tenant-context.type';
import { PERMISSION } from '../modules/auth/constants/permission.constant';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../common/decorators/api-standard-responses.decorator';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// New (this phase) — Admin-only tenant branding, consumed by both the
// Admin Settings page and QuotationPdfService's letterhead. Two routes
// (GET/PATCH `branding`), same "one Setting row, whole-object read +
// partial-merge write" shape SettingsService documents, plus the logo
// upload endpoint — same `FileInterceptor(memoryStorage) + ParseFilePipe`
// shape ProductImageController's own `POST /products/:id/images`
// established (see that file's own comment for why `memoryStorage()`).
@ApiTags('Settings')
@ApiBearerAuth('bearer')
@Controller(SETTINGS_ROUTE)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('branding')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SETTINGS_READ)
  @ApiOperation({ summary: 'Get tenant branding (company info + logo)' })
  @ApiOkResponse({ type: BrandingResponseDto })
  @ApiStandardAuthErrors()
  getBranding(@Tenant() tenant: TenantContext): Promise<BrandingResponseDto> {
    return this.settingsService.getBranding(tenant.tenantId);
  }

  @Patch('branding')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Update tenant branding (partial merge)' })
  @ApiOkResponse({ type: BrandingResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  updateBranding(
    @Body() dto: UpdateBrandingDto,
    @Tenant() tenant: TenantContext,
  ): Promise<BrandingResponseDto> {
    return this.settingsService.updateBranding(dto, tenant.tenantId);
  }

  @Post('branding/logo')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.SETTINGS_WRITE)
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
    summary: 'Upload the tenant company logo',
    description:
      `Multipart upload, field name "file", max ${MAX_LOGO_BYTES / (1024 * 1024)}MB, ` +
      'image/jpeg|png|webp only.',
  })
  @ApiOkResponse({ type: BrandingResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  uploadLogo(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_LOGO_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Tenant() tenant: TenantContext,
  ): Promise<BrandingResponseDto> {
    return this.settingsService.uploadLogo(
      { buffer: file.buffer, mimeType: file.mimetype, originalName: file.originalname },
      tenant.tenantId,
    );
  }
}
