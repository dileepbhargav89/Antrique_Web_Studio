import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { ProductImageRepository } from './repositories/product-image.repository';
import { ProductImageResponseDto } from './dto/product-image-response.dto';
import { StorageService } from '../../storage';
import { scanBufferForMalware } from '../../utils/malware-scan.util';

export interface UploadProductImageInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  altText?: string;
}

// Phase 7 (Product Image Upload) — genuinely new sub-resource surface,
// not a storage-backend swap on top of existing CRUD (see
// repositories/product-image.repository.ts's own comment: no per-image
// CRUD existed at all before this). `CreateProductImageDto`/the existing
// nested-create-on-`POST /products` flow (product.service.ts) are
// unchanged — this is additive, not a replacement.
@Injectable()
export class ProductImageService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productImageRepository: ProductImageRepository,
    private readonly storageService: StorageService,
  ) {}

  async upload(
    productId: string,
    input: UploadProductImageInput,
    tenantId: string,
  ): Promise<ProductImageResponseDto> {
    // Verify existence + tenant ownership before ever touching storage —
    // same "find-then-act" reasoning category.service.ts's own
    // update()/remove() already document.
    const product = await this.productRepository.findActiveById(productId, tenantId);
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    // Phase 10, Module 3 (Security Hardening) — the file's own magic
    // bytes, not the client-supplied `Content-Type` multipart header
    // (`input.mimeType`) used below only as a fallback. The controller's
    // `FileTypeValidator` already sniffs bytes to enforce the allowed-type
    // allowlist, but doesn't expose the detected type back to this layer
    // — re-sniffing here (same `file-type` package) is what makes the
    // OBJECT STORED IN S3 carry a `Content-Type` that matches its actual
    // bytes, not whatever the client claimed. Dynamic `import()`: `file-
    // type` ships ESM-only, this project's CommonJS output can't
    // `require()` it directly.
    const { fileTypeFromBuffer } = await import('file-type');
    const sniffed = await fileTypeFromBuffer(input.buffer);
    const contentType = sniffed?.mime ?? input.mimeType;

    await scanBufferForMalware(input.buffer);

    const extension = input.originalName.includes('.')
      ? input.originalName.split('.').pop()
      : undefined;
    const key = `products/${productId}/${randomUUID()}${extension ? `.${extension}` : ''}`;

    const url = await this.storageService.upload({
      key,
      body: input.buffer,
      contentType,
    });

    const image = await this.productImageRepository.create({
      data: {
        tenantId,
        productId,
        url,
        altText: input.altText,
        sortOrder: 0,
      },
    });

    return new ProductImageResponseDto(image.id, image.url, image.altText, image.sortOrder);
  }
}
