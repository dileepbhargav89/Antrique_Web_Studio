import { ConflictException, NotFoundException } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorRepository } from './repositories/vendor.repository';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createVendorRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'vendor-1',
    tenantId: TENANT_ID,
    name: 'Acme Hosting',
    slug: 'acme-hosting',
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    gstin: null,
    paymentTerms: null,
    notes: null,
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
    create: jest.fn(async () => createVendorRow()),
    update: jest.fn(async () => createVendorRow()),
    ...overrides,
  } as unknown as VendorRepository;
}

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('VendorService', () => {
  describe('create()', () => {
    it('creates a vendor scoped to the given tenantId, always ACTIVE', async () => {
      const repository = createFakeRepository();
      const service = new VendorService(repository);
      const dto = Object.assign(new CreateVendorDto(), {
        name: 'Acme Hosting',
        slug: 'acme-hosting',
      });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ tenantId: TENANT_ID, status: 'ACTIVE' }),
      });
    });

    it('translates a unique-constraint violation into ConflictException', async () => {
      const repository = createFakeRepository({
        create: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new VendorService(repository);
      const dto = Object.assign(new CreateVendorDto(), {
        name: 'Acme Hosting',
        slug: 'acme-hosting',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the vendor does not exist', async () => {
      const service = new VendorService(createFakeRepository());

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns the mapped vendor when found', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createVendorRow()),
      });
      const service = new VendorService(repository);

      const result = await service.findById('vendor-1', TENANT_ID);

      expect(result.id).toBe('vendor-1');
      expect(result.slug).toBe('acme-hosting');
    });
  });

  describe('list()', () => {
    it('applies default pagination/sort and tenant scoping via the repository', async () => {
      const repository = createFakeRepository();
      const service = new VendorService(repository);

      await service.list({}, TENANT_ID);

      expect(repository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        {},
        { createdAt: 'desc' },
        0,
        20,
      );
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the vendor does not exist', async () => {
      const repository = createFakeRepository();
      const service = new VendorService(repository);

      await expect(service.update('missing', new UpdateVendorDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows moving status to INACTIVE/ARCHIVED via the ordinary update route', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createVendorRow()),
      });
      const service = new VendorService(repository);
      const dto = Object.assign(new UpdateVendorDto(), { status: 'ARCHIVED' });

      await service.update('vendor-1', dto, TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'vendor-1' },
        data: expect.objectContaining({ status: 'ARCHIVED' }),
      });
    });

    it('translates a unique-constraint violation into ConflictException', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createVendorRow()),
        update: jest.fn(async () => {
          throw uniqueConstraintError();
        }),
      });
      const service = new VendorService(repository);
      const dto = Object.assign(new UpdateVendorDto(), { slug: 'taken-slug' });

      await expect(service.update('vendor-1', dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });
});
