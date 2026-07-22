import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerRepository } from './repositories/customer.repository';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createCustomerRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cust-1',
    tenantId: TENANT_ID,
    userId: null,
    email: 'jordan@example.com',
    firstName: 'Jordan',
    lastName: 'Rivera',
    phone: null,
    status: 'ACTIVE',
    addresses: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    createWithRelations: jest.fn(async () => createCustomerRow()),
    updateWithRelations: jest.fn(async () => createCustomerRow()),
    replaceAddresses: jest.fn(async () => undefined),
    update: jest.fn(async () => createCustomerRow()),
    userBelongsToTenant: jest.fn(async () => true),
    ...overrides,
  } as unknown as CustomerRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

function addressDto(overrides: Partial<CreateCustomerAddressDto> = {}): CreateCustomerAddressDto {
  return Object.assign(new CreateCustomerAddressDto(), {
    line1: '1 Main St',
    city: 'Newark',
    country: 'USA',
    ...overrides,
  });
}

describe('CustomerService', () => {
  describe('create()', () => {
    it('creates a customer scoped to the given tenantId', async () => {
      const repository = createFakeRepository();
      const service = new CustomerService(repository);
      const dto = Object.assign(new CreateCustomerDto(), { email: 'jordan@example.com' });

      await service.create(dto, TENANT_ID);

      expect(repository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          email: 'jordan@example.com',
          status: 'ACTIVE',
        }),
      );
    });

    it('rejects more than one default shipping address ("default addresses")', async () => {
      const repository = createFakeRepository();
      const service = new CustomerService(repository);
      const dto = Object.assign(new CreateCustomerDto(), {
        email: 'jordan@example.com',
        addresses: [
          addressDto({ isDefaultShipping: true }),
          addressDto({ isDefaultShipping: true }),
        ],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
      expect(repository.createWithRelations).not.toHaveBeenCalled();
    });

    it('rejects more than one default billing address', async () => {
      const repository = createFakeRepository();
      const service = new CustomerService(repository);
      const dto = Object.assign(new CreateCustomerDto(), {
        email: 'jordan@example.com',
        addresses: [addressDto({ isDefaultBilling: true }), addressDto({ isDefaultBilling: true })],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('rejects a userId that does not belong to the caller tenant', async () => {
      const repository = createFakeRepository({ userBelongsToTenant: jest.fn(async () => false) });
      const service = new CustomerService(repository);
      const dto = Object.assign(new CreateCustomerDto(), {
        email: 'jordan@example.com',
        userId: 'other-tenant-user',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('translates a unique-constraint violation into ConflictException ("duplicate email handling")', async () => {
      const repository = createFakeRepository({
        createWithRelations: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new CustomerService(repository);
      const dto = Object.assign(new CreateCustomerDto(), { email: 'jordan@example.com' });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the customer does not exist', async () => {
      const service = new CustomerService(createFakeRepository());

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the customer does not exist', async () => {
      const repository = createFakeRepository();
      const service = new CustomerService(repository);

      await expect(service.update('missing', new UpdateCustomerDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.updateWithRelations).not.toHaveBeenCalled();
    });

    it('replaces addresses only when the array is provided', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createCustomerRow()),
      });
      const service = new CustomerService(repository);

      await service.update('cust-1', new UpdateCustomerDto(), TENANT_ID);
      expect(repository.replaceAddresses).not.toHaveBeenCalled();

      await service.update(
        'cust-1',
        Object.assign(new UpdateCustomerDto(), { addresses: [addressDto()] }),
        TENANT_ID,
      );
      expect(repository.replaceAddresses).toHaveBeenCalled();
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createCustomerRow()),
      });
      const service = new CustomerService(repository);

      await service.remove('cust-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
