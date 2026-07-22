import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CustomerNoteService } from './customer-note.service';
import { CustomerNoteRepository } from './repositories/customer-note.repository';
import { CustomerRepository } from '../orders/repositories/customer.repository';
import { CreateCustomerNoteDto } from './dto/create-customer-note.dto';
import { UpdateCustomerNoteDto } from './dto/update-customer-note.dto';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createNoteRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'note-1',
    tenantId: TENANT_ID,
    customerId: 'cust-1',
    authorUserId: null,
    body: 'Hello',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createNoteRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createNoteRow()),
    update: jest.fn(async () => createNoteRow()),
    ...overrides,
  } as unknown as CustomerNoteRepository;
}

function createFakeCustomerRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => ({ id: 'cust-1' })),
    ...overrides,
  } as unknown as CustomerRepository;
}

describe('CustomerNoteService', () => {
  describe('create()', () => {
    it('creates a note scoped to the given tenantId without an authorUserId (known request-pipeline gap)', async () => {
      const repository = createFakeRepository();
      const service = new CustomerNoteService(repository, createFakeCustomerRepository());
      const dto = Object.assign(new CreateCustomerNoteDto(), {
        customerId: 'cust-1',
        body: 'Hello',
      });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, customerId: 'cust-1', body: 'Hello' },
      });
    });

    it('rejects a customerId that does not resolve within the caller tenant', async () => {
      const customerRepository = createFakeCustomerRepository({
        findActiveById: jest.fn(async () => null),
      });
      const service = new CustomerNoteService(createFakeRepository(), customerRepository);
      const dto = Object.assign(new CreateCustomerNoteDto(), {
        customerId: 'other-tenant-cust',
        body: 'Hello',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the note does not exist', async () => {
      const repository = createFakeRepository({ findActiveById: jest.fn(async () => null) });
      const service = new CustomerNoteService(repository, createFakeCustomerRepository());

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when the note does not exist', async () => {
      const repository = createFakeRepository({ findActiveById: jest.fn(async () => null) });
      const service = new CustomerNoteService(repository, createFakeCustomerRepository());

      await expect(
        service.update('missing', new UpdateCustomerNoteDto(), TENANT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt ("Notes never hard-delete")', async () => {
      const repository = createFakeRepository();
      const service = new CustomerNoteService(repository, createFakeCustomerRepository());

      await service.remove('note-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when the note does not exist', async () => {
      const repository = createFakeRepository({ findActiveById: jest.fn(async () => null) });
      const service = new CustomerNoteService(repository, createFakeCustomerRepository());

      await expect(service.remove('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
