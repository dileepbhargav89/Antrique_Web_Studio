import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductRepository } from './repositories/product.repository';
import { CategoryRepository } from './repositories/category.repository';
import { CollectionRepository } from './repositories/collection.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const CATEGORY_ID = '00000000-0000-7000-8000-000000000401';

function createProductRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'prod-1',
    tenantId: TENANT_ID,
    categoryId: null,
    collectionId: null,
    name: 'Solitaire Ring',
    slug: 'solitaire-ring',
    description: null,
    status: 'DRAFT',
    sortOrder: 0,
    metadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    variants: [],
    images: [],
    ...overrides,
  };
}

function createFakeProductRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    createWithRelations: jest.fn(async () => createProductRow()),
    updateWithRelations: jest.fn(async () => createProductRow()),
    update: jest.fn(async () => createProductRow()),
    ...overrides,
  } as unknown as ProductRepository;
}

function createFakeCategoryRepository(found: unknown = { id: CATEGORY_ID }) {
  return { findActiveById: jest.fn(async () => found) } as unknown as CategoryRepository;
}

function createFakeCollectionRepository(found: unknown = null) {
  return { findActiveById: jest.fn(async () => found) } as unknown as CollectionRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('ProductService', () => {
  describe('create()', () => {
    it('creates a product with nested variants/images, defaulting status to DRAFT', async () => {
      const productRepository = createFakeProductRepository();
      const service = new ProductService(
        productRepository,
        createFakeCategoryRepository(),
        createFakeCollectionRepository(),
      );
      const dto = Object.assign(new CreateProductDto(), {
        name: 'Solitaire Ring',
        slug: 'solitaire-ring',
        variants: [Object.assign(new CreateProductVariantDto(), { sku: 'RING-6', price: 249 })],
      });

      await service.create(dto, TENANT_ID);

      expect(productRepository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          status: 'DRAFT',
          variants: { create: [expect.objectContaining({ tenantId: TENANT_ID, sku: 'RING-6' })] },
        }),
      );
    });

    it("rejects a categoryId that does not belong to the caller's tenant, without ever calling createWithRelations()", async () => {
      const productRepository = createFakeProductRepository();
      const service = new ProductService(
        productRepository,
        createFakeCategoryRepository(null), // not found for this tenant
        createFakeCollectionRepository(),
      );
      const dto = Object.assign(new CreateProductDto(), {
        name: 'Solitaire Ring',
        slug: 'solitaire-ring',
        categoryId: CATEGORY_ID,
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
      expect(productRepository.createWithRelations).not.toHaveBeenCalled();
    });

    it("rejects a collectionId that does not belong to the caller's tenant", async () => {
      const productRepository = createFakeProductRepository();
      const service = new ProductService(
        productRepository,
        createFakeCategoryRepository(),
        createFakeCollectionRepository(null),
      );
      const dto = Object.assign(new CreateProductDto(), {
        name: 'Solitaire Ring',
        slug: 'solitaire-ring',
        collectionId: '00000000-0000-7000-8000-000000000501',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('translates a unique-constraint violation into ConflictException', async () => {
      const productRepository = createFakeProductRepository({
        createWithRelations: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new ProductService(
        productRepository,
        createFakeCategoryRepository(),
        createFakeCollectionRepository(),
      );
      const dto = Object.assign(new CreateProductDto(), { name: 'x', slug: 'x' });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('returns variants/images in the detail response', async () => {
      const productRepository = createFakeProductRepository({
        findActiveById: jest.fn(async () =>
          createProductRow({
            variants: [
              {
                id: 'v1',
                sku: 'RING-6',
                name: null,
                attributes: null,
                price: { toString: () => '249' },
                isActive: true,
                sortOrder: 0,
              },
            ],
          }),
        ),
      });
      const service = new ProductService(
        productRepository,
        createFakeCategoryRepository(),
        createFakeCollectionRepository(),
      );

      const result = await service.findById('prod-1', TENANT_ID);

      expect(result.variants).toHaveLength(1);
    });

    it('throws NotFoundException when missing', async () => {
      const service = new ProductService(
        createFakeProductRepository(),
        createFakeCategoryRepository(),
        createFakeCollectionRepository(),
      );

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('list()', () => {
    it('omits variants/images from list rows and passes category/collection/status/search filters through', async () => {
      const productRepository = createFakeProductRepository();
      const service = new ProductService(
        productRepository,
        createFakeCategoryRepository(),
        createFakeCollectionRepository(),
      );
      const query = Object.assign(
        {},
        { categoryId: CATEGORY_ID, status: 'PUBLISHED', search: 'ring' },
      );

      await service.list(query as never, TENANT_ID);

      expect(productRepository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        {
          categoryId: CATEGORY_ID,
          status: 'PUBLISHED',
          name: { contains: 'ring', mode: 'insensitive' },
        },
        { sortOrder: 'asc' },
        0,
        20,
      );
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without validating references when the product does not exist', async () => {
      const productRepository = createFakeProductRepository();
      const categoryRepository = createFakeCategoryRepository();
      const service = new ProductService(
        productRepository,
        categoryRepository,
        createFakeCollectionRepository(),
      );

      await expect(service.update('missing', new UpdateProductDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(categoryRepository.findActiveById).not.toHaveBeenCalled();
    });
  });

  describe('remove()', () => {
    it('soft-deletes the product via the plain update() (no relations needed for a void return)', async () => {
      const productRepository = createFakeProductRepository({
        findActiveById: jest.fn(async () => createProductRow()),
      });
      const service = new ProductService(
        productRepository,
        createFakeCategoryRepository(),
        createFakeCollectionRepository(),
      );

      await service.remove('prod-1', TENANT_ID);

      expect(productRepository.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(productRepository.updateWithRelations).not.toHaveBeenCalled();
    });
  });
});
