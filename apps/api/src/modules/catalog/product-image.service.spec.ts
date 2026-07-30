import { NotFoundException } from '@nestjs/common';
import { ProductImageService } from './product-image.service';
import { ProductRepository } from './repositories/product.repository';
import { ProductImageRepository } from './repositories/product-image.repository';
import { StorageService } from '../../storage';
import * as malwareScanUtil from '../../utils/malware-scan.util';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const PRODUCT_ID = '00000000-0000-7000-8000-000000000101';

// `file-type` ships ESM-only (see product-image.service.ts's own
// comment on the dynamic import) — Jest's CommonJS module resolver
// can't resolve it directly (confirmed separately: real Node/ts-node
// resolves the same `import('file-type')` fine — a Jest-specific gap,
// not a real runtime one), so a virtual mock stands in for it here.
// Defaults to resolving `undefined` (buffer not recognized, the
// fallback-to-client-mimeType path); individual tests override via
// `mockResolvedValueOnce` to exercise the sniffed-type path.
const fileTypeFromBuffer = jest.fn(async () => undefined as { mime: string } | undefined);
jest.mock('file-type', () => ({ fileTypeFromBuffer }), { virtual: true });

const IMAGE_BUFFER = Buffer.from('stand-in image bytes — file-type is mocked in this spec');

function createFakeProductRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: PRODUCT_ID, tenantId: TENANT_ID })),
    ...overrides,
  } as unknown as ProductRepository;
}

function createFakeProductImageRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'image-1',
      url: 'https://storage.example.com/products/img.png',
      altText: (data.altText as string | undefined) ?? null,
      sortOrder: 0,
    })),
    ...overrides,
  } as unknown as ProductImageRepository;
}

function createFakeStorageService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    upload: jest.fn(async () => 'https://storage.example.com/products/img.png'),
    ...overrides,
  } as unknown as StorageService;
}

describe('ProductImageService', () => {
  beforeEach(() => {
    fileTypeFromBuffer.mockClear();
    fileTypeFromBuffer.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createService(
    overrides: {
      productRepository?: ProductRepository;
      productImageRepository?: ProductImageRepository;
      storageService?: StorageService;
    } = {},
  ) {
    return new ProductImageService(
      overrides.productRepository ?? createFakeProductRepository(),
      overrides.productImageRepository ?? createFakeProductImageRepository(),
      overrides.storageService ?? createFakeStorageService(),
    );
  }

  describe('upload()', () => {
    it('throws NotFoundException when the product does not exist for this tenant', async () => {
      const productRepository = createFakeProductRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = createService({ productRepository });

      await expect(
        service.upload(
          PRODUCT_ID,
          { buffer: IMAGE_BUFFER, mimeType: 'image/png', originalName: 'photo.png' },
          TENANT_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('uses the sniffed magic-byte MIME type for storage, not the client-claimed header', async () => {
      fileTypeFromBuffer.mockResolvedValueOnce({ mime: 'image/png' });
      const storageService = createFakeStorageService();
      const service = createService({ storageService });

      // Client claims a mismatched type; the sniffed bytes say PNG.
      await service.upload(
        PRODUCT_ID,
        { buffer: IMAGE_BUFFER, mimeType: 'image/gif', originalName: 'photo.png' },
        TENANT_ID,
      );

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'image/png' }),
      );
    });

    it('falls back to the client-supplied MIME type when the buffer cannot be sniffed', async () => {
      const storageService = createFakeStorageService();
      const service = createService({ storageService });

      await service.upload(
        PRODUCT_ID,
        { buffer: IMAGE_BUFFER, mimeType: 'image/webp', originalName: 'photo.webp' },
        TENANT_ID,
      );

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'image/webp' }),
      );
    });

    it('calls the malware-scan extension point before uploading to storage', async () => {
      const scanSpy = jest.spyOn(malwareScanUtil, 'scanBufferForMalware');
      const storageService = createFakeStorageService();
      const service = createService({ storageService });

      await service.upload(
        PRODUCT_ID,
        { buffer: IMAGE_BUFFER, mimeType: 'image/png', originalName: 'photo.png' },
        TENANT_ID,
      );

      expect(scanSpy).toHaveBeenCalledWith(IMAGE_BUFFER);
      const scanOrder = scanSpy.mock.invocationCallOrder[0];
      const uploadOrder = (storageService.upload as jest.Mock).mock.invocationCallOrder[0];
      expect(scanOrder).toBeDefined();
      expect(uploadOrder).toBeDefined();
      expect(scanOrder as number).toBeLessThan(uploadOrder as number);
    });

    it('creates the ProductImage row with the storage URL and returns the mapped response', async () => {
      const productImageRepository = createFakeProductImageRepository();
      const service = createService({ productImageRepository });

      const result = await service.upload(
        PRODUCT_ID,
        {
          buffer: IMAGE_BUFFER,
          mimeType: 'image/png',
          originalName: 'photo.png',
          altText: 'A ring',
        },
        TENANT_ID,
      );

      expect(productImageRepository.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          productId: PRODUCT_ID,
          url: 'https://storage.example.com/products/img.png',
          altText: 'A ring',
          sortOrder: 0,
        },
      });
      expect(result.url).toBe('https://storage.example.com/products/img.png');
    });
  });
});
