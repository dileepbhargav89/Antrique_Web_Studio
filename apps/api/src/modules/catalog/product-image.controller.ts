import {
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
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
import { PRODUCT_ROUTE } from './constants/catalog.constant';
import { ProductImageService } from './product-image.service';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
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

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

// Genuinely new sub-resource surface (see product-image.service.ts's own
// header comment) — reuses PRODUCT_ROUTE + the existing `products:write`
// permission, no new permission key. `memoryStorage()` (not multer's own
// default disk storage) so `file.buffer` is populated for
// StorageService.upload() to read directly — the standard NestJS
// recipe for "upload straight to an external object store, never touch
// local disk." The app-wide 256kb JSON/urlencoded body limit (main.ts)
// does NOT govern this route — multipart bodies bypass that pipeline
// entirely; `ParseFilePipe`'s own `MaxFileSizeValidator` below is what
// actually caps this route's upload size.
@ApiTags('Product')
@ApiBearerAuth('bearer')
@Controller(PRODUCT_ROUTE)
export class ProductImageController {
  constructor(private readonly productImageService: ProductImageService) {}

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.PRODUCTS_WRITE)
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
    summary: 'Upload a product image',
    description:
      `Multipart upload, field name "file", max ${MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024)}MB, ` +
      'image/jpeg|png|webp|gif only.',
  })
  @ApiCreatedResponse({ type: ProductImageResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  @ApiNotFoundError('product')
  async upload(
    @Param('id', ParseUUIDPipe) productId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PRODUCT_IMAGE_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Tenant() tenant: TenantContext,
  ): Promise<ProductImageResponseDto> {
    return this.productImageService.upload(
      productId,
      { buffer: file.buffer, mimeType: file.mimetype, originalName: file.originalname },
      tenant.tenantId,
    );
  }
}
