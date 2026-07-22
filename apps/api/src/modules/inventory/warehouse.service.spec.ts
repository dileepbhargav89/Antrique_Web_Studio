import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseListQueryDto } from './dto/warehouse-list-query.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createWarehouseRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'wh-1',
    tenantId: TENANT_ID,
    name: 'Main Warehouse',
    slug: 'main-warehouse',
    addressLine1: null,
    city: null,
    region: null,
    postalCode: null,
    country: null,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createWarehouseRow()),
    update: jest.fn(async () => createWarehouseRow()),
    hasActiveInventory: jest.fn(async () => false),
    ...overrides,
  } as unknown as WarehouseRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('WarehouseService', () => {
  describe('create()', () => {
    it('creates a warehouse scoped to the given tenantId', async () => {
      const repository = createFakeRepository();
      const service = new WarehouseService(repository);
      const dto = Object.assign(new CreateWarehouseDto(), {
        name: 'Main Warehouse',
        slug: 'main-warehouse',
      });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_ID, status: 'ACTIVE' }),
        }),
      );
    });

    it('translates a unique-constraint violation into ConflictException', async () => {
      const repository = createFakeRepository({
        create: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new WarehouseService(repository);
      const dto = Object.assign(new CreateWarehouseDto(), {
        name: 'Main Warehouse',
        slug: 'main-warehouse',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the warehouse does not exist', async () => {
      const service = new WarehouseService(createFakeRepository());

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('list()', () => {
    it('applies default sort and passes filters through to the repository', async () => {
      const repository = createFakeRepository();
      const service = new WarehouseService(repository);
      const query = Object.assign(new WarehouseListQueryDto(), { search: 'main' });

      await service.list(query, TENANT_ID);

      expect(repository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        { name: { contains: 'main', mode: 'insensitive' } },
        { name: 'asc' },
        0,
        20,
      );
    });
  });

  describe('remove()', () => {
    it('throws NotFoundException when the warehouse does not exist', async () => {
      const repository = createFakeRepository();
      const service = new WarehouseService(repository);

      await expect(service.remove('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when active inventory exists ("soft delete only when no active inventory exists")', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createWarehouseRow()),
        hasActiveInventory: jest.fn(async () => true),
      });
      const service = new WarehouseService(repository);

      await expect(service.remove('wh-1', TENANT_ID)).rejects.toThrow(UnprocessableEntityException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('soft-deletes by setting deletedAt when no active inventory exists', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createWarehouseRow()),
        hasActiveInventory: jest.fn(async () => false),
      });
      const service = new WarehouseService(repository);

      await service.remove('wh-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'wh-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the warehouse does not exist', async () => {
      const repository = createFakeRepository();
      const service = new WarehouseService(repository);

      await expect(service.update('missing', new UpdateWarehouseDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
