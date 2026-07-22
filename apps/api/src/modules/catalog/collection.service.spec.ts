import { ConflictException, NotFoundException } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionRepository } from './repositories/collection.repository';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createCollectionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'col-1',
    tenantId: TENANT_ID,
    name: 'Signature Collection',
    slug: 'signature-collection',
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
    create: jest.fn(async () => createCollectionRow()),
    update: jest.fn(async () => createCollectionRow()),
    ...overrides,
  } as unknown as CollectionRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

// Same coverage shape as category.service.spec.ts.
describe('CollectionService', () => {
  it('creates a collection scoped to the given tenantId', async () => {
    const repository = createFakeRepository();
    const service = new CollectionService(repository);
    const dto = Object.assign(new CreateCollectionDto(), {
      name: 'Signature Collection',
      slug: 'signature-collection',
    });

    await service.create(dto, TENANT_ID);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: TENANT_ID }) }),
    );
  });

  it('translates a unique-constraint violation into ConflictException', async () => {
    const repository = createFakeRepository({
      create: jest.fn(async () => {
        throw uniqueConstraintError();
      }),
    });
    const service = new CollectionService(repository);
    const dto = Object.assign(new CreateCollectionDto(), { name: 'x', slug: 'x' });

    await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
  });

  it('findById() throws NotFoundException when missing', async () => {
    const service = new CollectionService(createFakeRepository());
    await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
  });

  it('update() throws NotFoundException without mutating when missing', async () => {
    const repository = createFakeRepository();
    const service = new CollectionService(repository);

    await expect(service.update('missing', new UpdateCollectionDto(), TENANT_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('remove() soft-deletes by setting deletedAt', async () => {
    const repository = createFakeRepository({
      findActiveById: jest.fn(async () => createCollectionRow()),
    });
    const service = new CollectionService(repository);

    await service.remove('col-1', TENANT_ID);

    expect(repository.update).toHaveBeenCalledWith({
      where: { id: 'col-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });
});
