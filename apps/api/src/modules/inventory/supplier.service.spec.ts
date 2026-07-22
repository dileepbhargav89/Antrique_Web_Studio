import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { SupplierRepository } from './repositories/supplier.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createSupplierRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sup-1',
    tenantId: TENANT_ID,
    name: 'Millbrook Textiles',
    slug: 'millbrook-textiles',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    status: 'ACTIVE',
    notes: null,
    supplierProducts: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    createWithRelations: jest.fn(async () => createSupplierRow()),
    updateWithRelations: jest.fn(async () => createSupplierRow()),
    replaceSupplierProducts: jest.fn(async () => undefined),
    update: jest.fn(async () => createSupplierRow()),
    productVariantExistsForTenant: jest.fn(async () => true),
    fabricExistsForTenant: jest.fn(async () => true),
    ...overrides,
  } as unknown as SupplierRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('SupplierService', () => {
  describe('create()', () => {
    it('creates a supplier scoped to the given tenantId', async () => {
      const repository = createFakeRepository();
      const service = new SupplierService(repository);
      const dto = Object.assign(new CreateSupplierDto(), {
        name: 'Millbrook Textiles',
        slug: 'millbrook-textiles',
      });

      await service.create(dto, TENANT_ID);

      expect(repository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, status: 'ACTIVE' }),
      );
    });

    it('rejects a nested product missing exactly one of productVariantId/fabricId', async () => {
      const repository = createFakeRepository();
      const service = new SupplierService(repository);
      const badProduct = Object.assign(new CreateSupplierProductDto(), {});
      const dto = Object.assign(new CreateSupplierDto(), {
        name: 'Millbrook Textiles',
        slug: 'millbrook-textiles',
        products: [badProduct],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
      expect(repository.createWithRelations).not.toHaveBeenCalled();
    });

    it('rejects a nested product with BOTH productVariantId and fabricId', async () => {
      const repository = createFakeRepository();
      const service = new SupplierService(repository);
      const badProduct = Object.assign(new CreateSupplierProductDto(), {
        productVariantId: 'var-1',
        fabricId: 'fab-1',
      });
      const dto = Object.assign(new CreateSupplierDto(), {
        name: 'Millbrook Textiles',
        slug: 'millbrook-textiles',
        products: [badProduct],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a fabricId that does not belong to the caller tenant', async () => {
      const repository = createFakeRepository({
        fabricExistsForTenant: jest.fn(async () => false),
      });
      const service = new SupplierService(repository);
      const product = Object.assign(new CreateSupplierProductDto(), { fabricId: 'fab-1' });
      const dto = Object.assign(new CreateSupplierDto(), {
        name: 'Millbrook Textiles',
        slug: 'millbrook-textiles',
        products: [product],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('translates a unique-constraint violation into ConflictException', async () => {
      const repository = createFakeRepository({
        createWithRelations: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new SupplierService(repository);
      const dto = Object.assign(new CreateSupplierDto(), {
        name: 'Millbrook Textiles',
        slug: 'millbrook-textiles',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the supplier does not exist', async () => {
      const service = new SupplierService(createFakeRepository());

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the supplier does not exist', async () => {
      const repository = createFakeRepository();
      const service = new SupplierService(repository);

      await expect(service.update('missing', new UpdateSupplierDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.updateWithRelations).not.toHaveBeenCalled();
    });

    it('replaces supplier products only when the array is provided', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createSupplierRow()),
      });
      const service = new SupplierService(repository);

      await service.update('sup-1', new UpdateSupplierDto(), TENANT_ID);
      expect(repository.replaceSupplierProducts).not.toHaveBeenCalled();

      const product = Object.assign(new CreateSupplierProductDto(), { fabricId: 'fab-1' });
      await service.update(
        'sup-1',
        Object.assign(new UpdateSupplierDto(), { products: [product] }),
        TENANT_ID,
      );
      expect(repository.replaceSupplierProducts).toHaveBeenCalled();
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createSupplierRow()),
      });
      const service = new SupplierService(repository);

      await service.remove('sup-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
