import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeasurementService } from './measurement.service';
import { MeasurementRepository } from './repositories/measurement.repository';
import { CreateMeasurementProfileDto } from './dto/create-measurement-profile.dto';
import { UpdateMeasurementProfileDto } from './dto/update-measurement-profile.dto';
import { CreateMeasurementDto } from './dto/create-measurement.dto';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createProfileRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'mp-1',
    tenantId: TENANT_ID,
    userId: null,
    name: 'Default Measurements',
    notes: null,
    measurements: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    createWithRelations: jest.fn(async () => createProfileRow()),
    updateWithRelations: jest.fn(async () => createProfileRow()),
    replaceMeasurements: jest.fn(async () => createProfileRow()),
    update: jest.fn(async () => createProfileRow()),
    userBelongsToTenant: jest.fn(async () => true),
    ...overrides,
  } as unknown as MeasurementRepository;
}

function measurementDto(overrides: Partial<CreateMeasurementDto> = {}): CreateMeasurementDto {
  return Object.assign(new CreateMeasurementDto(), {
    name: 'Chest',
    value: '40.00',
    unit: 'IN',
    ...overrides,
  });
}

describe('MeasurementService', () => {
  describe('create()', () => {
    it('creates a profile scoped to the given tenantId', async () => {
      const repository = createFakeRepository();
      const service = new MeasurementService(repository);
      const dto = Object.assign(new CreateMeasurementProfileDto(), {
        name: 'Default Measurements',
      });

      await service.create(dto, TENANT_ID);

      expect(repository.createWithRelations).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, name: 'Default Measurements' }),
      );
    });

    it('rejects duplicate measurement names within the same request ("names unique within a profile")', async () => {
      const repository = createFakeRepository();
      const service = new MeasurementService(repository);
      const dto = Object.assign(new CreateMeasurementProfileDto(), {
        name: 'Default Measurements',
        measurements: [measurementDto({ name: 'Chest' }), measurementDto({ name: 'chest' })],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
      expect(repository.createWithRelations).not.toHaveBeenCalled();
    });

    it('rejects a userId that does not belong to the caller tenant', async () => {
      const repository = createFakeRepository({ userBelongsToTenant: jest.fn(async () => false) });
      const service = new MeasurementService(repository);
      const dto = Object.assign(new CreateMeasurementProfileDto(), {
        name: 'Default Measurements',
        userId: 'other-tenant-user',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the profile does not exist', async () => {
      const service = new MeasurementService(createFakeRepository());

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the profile does not exist', async () => {
      const repository = createFakeRepository();
      const service = new MeasurementService(repository);

      await expect(
        service.update('missing', new UpdateMeasurementProfileDto(), TENANT_ID),
      ).rejects.toThrow(NotFoundException);
      expect(repository.updateWithRelations).not.toHaveBeenCalled();
    });

    it('replaces measurements only when the array is provided (full replace, not diffed)', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createProfileRow()),
      });
      const service = new MeasurementService(repository);

      await service.update('mp-1', new UpdateMeasurementProfileDto(), TENANT_ID);
      expect(repository.replaceMeasurements).not.toHaveBeenCalled();

      await service.update(
        'mp-1',
        Object.assign(new UpdateMeasurementProfileDto(), { measurements: [measurementDto()] }),
        TENANT_ID,
      );
      expect(repository.replaceMeasurements).toHaveBeenCalledWith(TENANT_ID, 'mp-1', [
        measurementDto(),
      ]);
    });

    it('rejects duplicate measurement names on update too', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createProfileRow()),
      });
      const service = new MeasurementService(repository);
      const dto = Object.assign(new UpdateMeasurementProfileDto(), {
        measurements: [measurementDto({ name: 'Waist' }), measurementDto({ name: 'Waist' })],
      });

      await expect(service.update('mp-1', dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createProfileRow()),
      });
      const service = new MeasurementService(repository);

      await service.remove('mp-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'mp-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
