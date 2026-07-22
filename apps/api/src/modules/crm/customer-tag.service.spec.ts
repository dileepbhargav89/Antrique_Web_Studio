import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerTagService } from './customer-tag.service';
import { CustomerTagRepository } from './repositories/customer-tag.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateCustomerTagDto } from './dto/create-customer-tag.dto';
import { UpdateCustomerTagDto } from './dto/update-customer-tag.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createTagRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tag-1',
    tenantId: TENANT_ID,
    name: 'VIP',
    slug: 'vip',
    color: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeTagRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createTagRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createTagRow()),
    update: jest.fn(async () => createTagRow()),
    assign: jest.fn(async () => ({})),
    unassign: jest.fn(async () => true),
    ...overrides,
  } as unknown as CustomerTagRepository;
}

function createFakeCustomerRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'cust-1' })),
    ...overrides,
  } as unknown as CustomerRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('CustomerTagService', () => {
  describe('create()', () => {
    it('creates a tag scoped to the given tenantId', async () => {
      const repository = createFakeTagRepository();
      const service = new CustomerTagService(repository, createFakeCustomerRepository());
      const dto = Object.assign(new CreateCustomerTagDto(), { name: 'VIP', slug: 'vip' });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, name: 'VIP', slug: 'vip', color: undefined },
      });
    });

    it('translates a unique-constraint violation on slug into ConflictException', async () => {
      const repository = createFakeTagRepository({
        create: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new CustomerTagService(repository, createFakeCustomerRepository());
      const dto = Object.assign(new CreateCustomerTagDto(), { name: 'VIP', slug: 'vip' });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when the tag does not exist', async () => {
      const repository = createFakeTagRepository({ findActiveById: jest.fn(async () => null) });
      const service = new CustomerTagService(repository, createFakeCustomerRepository());

      await expect(
        service.update('missing', new UpdateCustomerTagDto(), TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt', async () => {
      const repository = createFakeTagRepository();
      const service = new CustomerTagService(repository, createFakeCustomerRepository());

      await service.remove('tag-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('assign()', () => {
    it('assigns the tag to the customer once both are validated within the caller tenant', async () => {
      const repository = createFakeTagRepository();
      const customerRepository = createFakeCustomerRepository();
      const service = new CustomerTagService(repository, customerRepository);

      await service.assign('tag-1', 'cust-1', TENANT_ID);

      expect(repository.assign).toHaveBeenCalledWith(TENANT_ID, 'cust-1', 'tag-1');
    });

    it('rejects a tag that does not resolve within the caller tenant', async () => {
      const repository = createFakeTagRepository({ findActiveById: jest.fn(async () => null) });
      const service = new CustomerTagService(repository, createFakeCustomerRepository());

      await expect(service.assign('missing', 'cust-1', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a customer that does not resolve within the caller tenant', async () => {
      const customerRepository = createFakeCustomerRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = new CustomerTagService(createFakeTagRepository(), customerRepository);

      await expect(service.assign('tag-1', 'other-tenant-cust', TENANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('treats re-assigning an already-assigned tag as a no-op, not an error', async () => {
      const repository = createFakeTagRepository({
        assign: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new CustomerTagService(repository, createFakeCustomerRepository());

      await expect(service.assign('tag-1', 'cust-1', TENANT_ID)).resolves.toBeUndefined();
    });
  });

  describe('unassign()', () => {
    it('throws NotFoundException when the tag was not assigned to begin with', async () => {
      const repository = createFakeTagRepository({ unassign: jest.fn(async () => false) });
      const service = new CustomerTagService(repository, createFakeCustomerRepository());

      await expect(service.unassign('tag-1', 'cust-1', TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
