import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { FabricService } from './fabric.service';
import { FabricRepository } from './repositories/fabric.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateFabricDto } from './dto/create-fabric.dto';
import { UpdateFabricDto } from './dto/update-fabric.dto';
import { FabricListQueryDto } from './dto/fabric-list-query.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFabricRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'fab-1',
    tenantId: TENANT_ID,
    fabricCategoryId: null,
    name: 'Navy Wool',
    slug: 'navy-wool',
    description: null,
    composition: null,
    colorHex: null,
    priceAdjustment: { toString: () => '0' },
    status: 'ACTIVE',
    sortOrder: 0,
    images: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeFabricRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    createWithRelations: jest.fn(async () => createFabricRow()),
    updateWithRelations: jest.fn(async () => createFabricRow()),
    update: jest.fn(async () => createFabricRow()),
    setProductLinks: jest.fn(async () => undefined),
    ...overrides,
  } as unknown as FabricRepository;
}

function createFakeProductRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'prod-1' })),
    findExistingIds: jest.fn(async () => new Set(['prod-1'])),
    ...overrides,
  } as unknown as ProductRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('FabricService', () => {
  describe('create()', () => {
    it('creates a fabric scoped to the given tenantId, defaulting status/priceAdjustment/sortOrder', async () => {
      const fabricRepository = createFakeFabricRepository();
      const service = new FabricService(fabricRepository, createFakeProductRepository());
      const dto = Object.assign(new CreateFabricDto(), { name: 'Navy Wool', slug: 'navy-wool' });

      await service.create(dto, TENANT_ID);

      expect(fabricRepository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          name: 'Navy Wool',
          slug: 'navy-wool',
          priceAdjustment: '0',
          status: 'ACTIVE',
          sortOrder: 0,
        }),
      );
    });

    it('rejects a productId that does not belong to the caller tenant ("Fabrics belong to the current tenant")', async () => {
      const fabricRepository = createFakeFabricRepository();
      const productRepository = createFakeProductRepository({
        findExistingIds: jest.fn(async () => new Set()),
      });
      const service = new FabricService(fabricRepository, productRepository);
      const dto = Object.assign(new CreateFabricDto(), {
        name: 'Navy Wool',
        slug: 'navy-wool',
        productIds: ['other-tenant-product'],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
      expect(fabricRepository.createWithRelations).not.toHaveBeenCalled();
    });

    it('links to the given products after creation', async () => {
      const fabricRepository = createFakeFabricRepository();
      const service = new FabricService(fabricRepository, createFakeProductRepository());
      const dto = Object.assign(new CreateFabricDto(), {
        name: 'Navy Wool',
        slug: 'navy-wool',
        productIds: ['prod-1'],
      });

      await service.create(dto, TENANT_ID);

      expect(fabricRepository.setProductLinks).toHaveBeenCalledWith(TENANT_ID, 'fab-1', ['prod-1']);
    });

    it('translates a unique-constraint violation into ConflictException', async () => {
      const fabricRepository = createFakeFabricRepository({
        createWithRelations: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new FabricService(fabricRepository, createFakeProductRepository());
      const dto = Object.assign(new CreateFabricDto(), { name: 'Navy Wool', slug: 'navy-wool' });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the fabric does not exist', async () => {
      const service = new FabricService(
        createFakeFabricRepository(),
        createFakeProductRepository(),
      );

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('list()', () => {
    it('filters by fabricCategoryId, status, productId (via the productFabrics join), and search', async () => {
      const fabricRepository = createFakeFabricRepository();
      const service = new FabricService(fabricRepository, createFakeProductRepository());
      const query = Object.assign(new FabricListQueryDto(), {
        fabricCategoryId: 'cat-1',
        status: 'ACTIVE',
        productId: 'prod-1',
        search: 'wool',
      });

      await service.list(query, TENANT_ID);

      expect(fabricRepository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        {
          fabricCategoryId: 'cat-1',
          status: 'ACTIVE',
          productFabrics: { some: { productId: 'prod-1' } },
          name: { contains: 'wool', mode: 'insensitive' },
        },
        { sortOrder: 'asc' },
        0,
        20,
      );
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the fabric does not exist', async () => {
      const fabricRepository = createFakeFabricRepository();
      const service = new FabricService(fabricRepository, createFakeProductRepository());

      await expect(service.update('missing', new UpdateFabricDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(fabricRepository.updateWithRelations).not.toHaveBeenCalled();
    });

    it('replaces product links only when productIds is provided', async () => {
      const fabricRepository = createFakeFabricRepository({
        findActiveById: jest.fn(async () => createFabricRow()),
      });
      const service = new FabricService(fabricRepository, createFakeProductRepository());

      await service.update('fab-1', new UpdateFabricDto(), TENANT_ID);
      expect(fabricRepository.setProductLinks).not.toHaveBeenCalled();

      await service.update(
        'fab-1',
        Object.assign(new UpdateFabricDto(), { productIds: ['prod-1'] }),
        TENANT_ID,
      );
      expect(fabricRepository.setProductLinks).toHaveBeenCalledWith(TENANT_ID, 'fab-1', ['prod-1']);
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt', async () => {
      const fabricRepository = createFakeFabricRepository({
        findActiveById: jest.fn(async () => createFabricRow()),
      });
      const service = new FabricService(fabricRepository, createFakeProductRepository());

      await service.remove('fab-1', TENANT_ID);

      expect(fabricRepository.update).toHaveBeenCalledWith({
        where: { id: 'fab-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
