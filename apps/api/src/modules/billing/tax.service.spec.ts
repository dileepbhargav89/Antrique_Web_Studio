import { NotFoundException } from '@nestjs/common';
import { TaxService } from './tax.service';
import { TaxRepository } from './repositories/tax.repository';
import { CreateTaxRateDto } from './dto/create-tax-rate.dto';
import { UpdateTaxRateDto } from './dto/update-tax-rate.dto';
import { Prisma } from '../../../generated/prisma/client';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createTaxRateRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tax-1',
    tenantId: TENANT_ID,
    name: 'GST 18%',
    rate: new Prisma.Decimal('18.00'),
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createTaxRateRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createTaxRateRow()),
    update: jest.fn(async () => createTaxRateRow()),
    ...overrides,
  } as unknown as TaxRepository;
}

describe('TaxService', () => {
  describe('create()', () => {
    it('creates a tax rate scoped to the given tenantId', async () => {
      const repository = createFakeRepository();
      const service = new TaxService(repository);
      const dto = Object.assign(new CreateTaxRateDto(), { name: 'GST 18%', rate: '18.00' });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          name: 'GST 18%',
          rate: expect.any(Prisma.Decimal),
          isActive: true,
        },
      });
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the tax rate does not exist', async () => {
      const repository = createFakeRepository({ findActiveById: jest.fn(async () => null) });
      const service = new TaxService(repository);

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the tax rate does not exist', async () => {
      const repository = createFakeRepository({ findActiveById: jest.fn(async () => null) });
      const service = new TaxService(repository);

      await expect(service.update('missing', new UpdateTaxRateDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt', async () => {
      const repository = createFakeRepository();
      const service = new TaxService(repository);

      await service.remove('tax-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'tax-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('calculateTax()', () => {
    it('computes tax as subtotal * rate / 100, rounded to 2 decimal places', () => {
      const service = new TaxService(createFakeRepository());

      const result = service.calculateTax(new Prisma.Decimal('100.00'), {
        rate: new Prisma.Decimal('18.00'),
      });

      expect(result.toString()).toBe('18');
    });

    it('rounds to 2 decimal places for a non-terminating result', () => {
      const service = new TaxService(createFakeRepository());

      const result = service.calculateTax(new Prisma.Decimal('99.99'), {
        rate: new Prisma.Decimal('18.00'),
      });

      expect(result.toString()).toBe('18');
    });
  });
});
