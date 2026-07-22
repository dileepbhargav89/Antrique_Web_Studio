import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StyleOptionService } from './style-option.service';
import { StyleOptionRepository } from './repositories/style-option.repository';
import { CreateStyleOptionDto } from './dto/create-style-option.dto';
import { UpdateStyleOptionDto } from './dto/update-style-option.dto';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const CUSTOMIZATION_ID = 'pc-1';
const OTHER_CUSTOMIZATION_ID = 'pc-2';

function createOptionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'so-1',
    tenantId: TENANT_ID,
    styleOptionGroupId: 'group-1',
    name: 'Spread Collar',
    description: null,
    priceAdjustment: { toString: () => '0' },
    status: 'ACTIVE',
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createGroupRow(productCustomizationId = CUSTOMIZATION_ID) {
  return { id: 'group-1', tenantId: TENANT_ID, productCustomizationId };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => null),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    findGroupById: jest.fn(async () => createGroupRow()),
    setIncompatibilities: jest.fn(async () => undefined),
    findIncompatibilities: jest.fn(async () => []),
    create: jest.fn(async () => createOptionRow()),
    update: jest.fn(async () => createOptionRow()),
    ...overrides,
  } as unknown as StyleOptionRepository;
}

describe('StyleOptionService', () => {
  describe('create()', () => {
    it('creates a style option scoped to the given tenantId', async () => {
      const repository = createFakeRepository();
      const service = new StyleOptionService(repository);
      const dto = Object.assign(new CreateStyleOptionDto(), {
        styleOptionGroupId: 'group-1',
        name: 'Spread Collar',
      });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_ID, styleOptionGroupId: 'group-1' }),
        }),
      );
    });

    it('rejects a styleOptionGroupId that does not belong to the caller tenant', async () => {
      const repository = createFakeRepository({ findGroupById: jest.fn(async () => null) });
      const service = new StyleOptionService(repository);
      const dto = Object.assign(new CreateStyleOptionDto(), {
        styleOptionGroupId: 'other-tenant-group',
        name: 'Spread Collar',
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects an incompatibleStyleOptionIds entry from a different product ("style options belong to the selected product")', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createOptionRow({ id: 'other-option' })),
        findGroupById: jest
          .fn()
          .mockResolvedValueOnce(createGroupRow(CUSTOMIZATION_ID))
          .mockResolvedValueOnce(createGroupRow(OTHER_CUSTOMIZATION_ID)),
      });
      const service = new StyleOptionService(repository);
      const dto = Object.assign(new CreateStyleOptionDto(), {
        styleOptionGroupId: 'group-1',
        name: 'Spread Collar',
        incompatibleStyleOptionIds: ['other-option'],
      });

      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('sets incompatibilities for options confirmed to belong to the same product', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createOptionRow({ id: 'sibling-option' })),
        findGroupById: jest.fn(async () => createGroupRow(CUSTOMIZATION_ID)),
      });
      const service = new StyleOptionService(repository);
      const dto = Object.assign(new CreateStyleOptionDto(), {
        styleOptionGroupId: 'group-1',
        name: 'Spread Collar',
        incompatibleStyleOptionIds: ['sibling-option'],
      });

      await service.create(dto, TENANT_ID);

      expect(repository.setIncompatibilities).toHaveBeenCalledWith(TENANT_ID, 'so-1', [
        'sibling-option',
      ]);
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the style option does not exist', async () => {
      const service = new StyleOptionService(createFakeRepository());

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException without mutating when the style option does not exist', async () => {
      const repository = createFakeRepository();
      const service = new StyleOptionService(repository);

      await expect(
        service.update('missing', new UpdateStyleOptionDto(), TENANT_ID),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('rejects self-incompatibility ("incompatible style combinations are rejected")', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createOptionRow()),
      });
      const service = new StyleOptionService(repository);
      const dto = Object.assign(new UpdateStyleOptionDto(), {
        incompatibleStyleOptionIds: ['so-1'],
      });

      await expect(service.update('so-1', dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove()', () => {
    it('soft-deletes by setting deletedAt', async () => {
      const repository = createFakeRepository({
        findActiveById: jest.fn(async () => createOptionRow()),
      });
      const service = new StyleOptionService(repository);

      await service.remove('so-1', TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'so-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
