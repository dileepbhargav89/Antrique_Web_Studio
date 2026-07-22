import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryRepository } from './repositories/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createCategoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cat-1',
    tenantId: TENANT_ID,
    name: 'Rings',
    slug: 'rings',
    description: null,
    status: 'ACTIVE',
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createCategoryRow()),
    update: jest.fn(async () => createCategoryRow()),
    ...overrides,
  } as unknown as CategoryRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('CategoryService', () => {
  describe('create()', () => {
    it('creates a category scoped to the given tenantId, defaulting status/sortOrder', async () => {
      const repository = createFakeRepository();
      const service = new CategoryService(repository);
      const dto: CreateCategoryDto = Object.assign(new CreateCategoryDto(), {
        name: 'Rings',
        slug: 'rings',
      });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          name: 'Rings',
          slug: 'rings',
          description: undefined,
          status: 'ACTIVE',
          sortOrder: 0,
        },
      });
    });

    it('translates a unique-constraint violation into ConflictException', async () => {
      const repository = createFakeRepository({
        create: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new CategoryService(repository);
      const dto = Object.assign(new CreateCategoryDto(), { name: 'Rings', slug: 'rings' });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('returns the mapped category when found', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createCategoryRow()),
      });
      const service = new CategoryService(repository);

      const result = await service.findById('cat-1', TENANT_ID);

      expect(result.id).toBe('cat-1');
      expect(repository.findActiveById).toHaveBeenCalledWith('cat-1', TENANT_ID);
    });

    it('throws NotFoundException when the category does not exist (or belongs to another tenant)', async () => {
      const repository = createFakeRepository();
      const service = new CategoryService(repository);

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('list()', () => {
    it('applies default pagination and passes filters through to the repository', async () => {
      const repository = createFakeRepository();
      const service = new CategoryService(repository);
      const query = Object.assign(new CategoryListQueryDto(), { search: 'ring' });

      await service.list(query, TENANT_ID);

      expect(repository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        { name: { contains: 'ring', mode: 'insensitive' } },
        { sortOrder: 'asc' },
        0,
        20,
      );
    });

    it('computes skip from page/limit', async () => {
      const repository = createFakeRepository();
      const service = new CategoryService(repository);
      const query = Object.assign(new CategoryListQueryDto(), { page: 3, limit: 10 });

      await service.list(query, TENANT_ID);

      expect(repository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        {},
        { sortOrder: 'asc' },
        20,
        10,
      );
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without calling update() when the category does not exist', async () => {
      const repository = createFakeRepository();
      const service = new CategoryService(repository);
      const dto = new UpdateCategoryDto();

      await expect(service.update('missing', dto, TENANT_ID)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('updates an existing, tenant-owned category', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createCategoryRow()),
      });
      const service = new CategoryService(repository);
      const dto = Object.assign(new UpdateCategoryDto(), { name: 'Renamed' });

      await service.update('cat-1', dto, TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: {
          name: 'Renamed',
          slug: undefined,
          description: undefined,
          status: undefined,
          sortOrder: undefined,
        },
      });
    });
  });

  describe('remove()', () => {
    it('throws NotFoundException without calling update() when the category does not exist', async () => {
      const repository = createFakeRepository();
      const service = new CategoryService(repository);

      await expect(service.remove('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('soft-deletes by setting deletedAt, never a real delete()', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createCategoryRow()),
        delete: jest.fn(),
      });
      const service = new CategoryService(repository);

      await service.remove('cat-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
