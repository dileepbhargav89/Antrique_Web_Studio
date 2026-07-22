import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProductCustomizationService } from './product-customization.service';
import { ProductCustomizationRepository } from './repositories/product-customization.repository';
import { StyleOptionRepository } from './repositories/style-option.repository';
import { ProductRepository } from '../catalog/repositories/product.repository';
import { CreateProductCustomizationDto } from './dto/create-product-customization.dto';
import { UpdateProductCustomizationDto } from './dto/update-product-customization.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createCustomizationRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'pc-1',
    tenantId: TENANT_ID,
    productId: 'prod-1',
    name: null,
    description: null,
    isActive: true,
    styleOptionGroups: [],
    pricingAdjustments: [],
    monogramOptions: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeCustomizationRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createCustomizationRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    createWithRelations: jest.fn(async () => createCustomizationRow()),
    updateWithRelations: jest.fn(async () => createCustomizationRow()),
    replacePricingAdjustments: jest.fn(async () => undefined),
    replaceMonogramOptions: jest.fn(async () => undefined),
    ...overrides,
  } as unknown as ProductCustomizationRepository;
}

function createFakeProductRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'prod-1' })),
    ...overrides,
  } as unknown as ProductRepository;
}

function createFakeStyleOptionRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'so-1', styleOptionGroupId: 'group-1' })),
    findGroupById: jest.fn(async () => ({ id: 'group-1', productCustomizationId: 'pc-1' })),
    ...overrides,
  } as unknown as StyleOptionRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('ProductCustomizationService', () => {
  describe('create()', () => {
    it('creates a customization scoped to the given tenantId', async () => {
      const repository = createFakeCustomizationRepository();
      const service = new ProductCustomizationService(
        repository,
        createFakeProductRepository(),
        createFakeStyleOptionRepository(),
      );
      const dto = Object.assign(new CreateProductCustomizationDto(), { productId: 'prod-1' });

      await service.create(dto, TENANT_ID);

      expect(repository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, productId: 'prod-1', isActive: true }),
      );
    });

    it('rejects a productId that does not belong to the caller tenant', async () => {
      const service = new ProductCustomizationService(
        createFakeCustomizationRepository(),
        createFakeProductRepository({ findActiveById: jest.fn(async () => null) }),
        createFakeStyleOptionRepository(),
      );
      const dto = Object.assign(new CreateProductCustomizationDto(), {
        productId: 'other-tenant-product',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a pricingAdjustment with styleOptionId at creation time', async () => {
      const repository = createFakeCustomizationRepository();
      const service = new ProductCustomizationService(
        repository,
        createFakeProductRepository(),
        createFakeStyleOptionRepository(),
      );
      const dto = Object.assign(new CreateProductCustomizationDto(), {
        productId: 'prod-1',
        pricingAdjustments: [{ styleOptionId: 'so-1', label: 'Bad', amount: '5.00' }],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
      expect(repository.createWithRelations).not.toHaveBeenCalled();
    });

    it('translates a unique-constraint violation into ConflictException ("a product already has a customization")', async () => {
      const repository = createFakeCustomizationRepository({
        createWithRelations: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new ProductCustomizationService(
        repository,
        createFakeProductRepository(),
        createFakeStyleOptionRepository(),
      );
      const dto = Object.assign(new CreateProductCustomizationDto(), { productId: 'prod-1' });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the customization does not exist', async () => {
      const service = new ProductCustomizationService(
        createFakeCustomizationRepository({ findActiveById: jest.fn(async () => null) }),
        createFakeProductRepository(),
        createFakeStyleOptionRepository(),
      );

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the customization does not exist', async () => {
      const repository = createFakeCustomizationRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = new ProductCustomizationService(
        repository,
        createFakeProductRepository(),
        createFakeStyleOptionRepository(),
      );

      await expect(
        service.update('missing', new UpdateProductCustomizationDto(), TENANT_ID),
      ).rejects.toThrow(NotFoundException);
      expect(repository.updateWithRelations).not.toHaveBeenCalled();
    });

    it("rejects a pricingAdjustment styleOptionId belonging to a different product's customization", async () => {
      const styleOptionRepository = createFakeStyleOptionRepository({
        findGroupById: jest.fn(async () => ({
          id: 'group-1',
          productCustomizationId: 'a-different-customization',
        })),
      });
      const service = new ProductCustomizationService(
        createFakeCustomizationRepository(),
        createFakeProductRepository(),
        styleOptionRepository,
      );
      const dto = Object.assign(new UpdateProductCustomizationDto(), {
        pricingAdjustments: [{ styleOptionId: 'so-1', label: 'Upgrade', amount: '15.00' }],
      });

      await expect(service.update('pc-1', dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('replaces pricing adjustments and monogram options only when provided', async () => {
      const repository = createFakeCustomizationRepository();
      const service = new ProductCustomizationService(
        repository,
        createFakeProductRepository(),
        createFakeStyleOptionRepository(),
      );

      await service.update('pc-1', new UpdateProductCustomizationDto(), TENANT_ID);
      expect(repository.replacePricingAdjustments).not.toHaveBeenCalled();
      expect(repository.replaceMonogramOptions).not.toHaveBeenCalled();

      await service.update(
        'pc-1',
        Object.assign(new UpdateProductCustomizationDto(), {
          pricingAdjustments: [{ label: 'Fee', amount: '5.00' }],
          monogramOptions: [{ label: 'Chest' }],
        }),
        TENANT_ID,
      );
      expect(repository.replacePricingAdjustments).toHaveBeenCalled();
      expect(repository.replaceMonogramOptions).toHaveBeenCalled();
    });

    it('does not accept styleOptionGroups on update (immutable after create)', () => {
      const dto = new UpdateProductCustomizationDto();
      expect('styleOptionGroups' in dto).toBe(false);
    });
  });
});
