import { NotFoundException } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientRepository } from './repositories/client.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientStatus } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createClientRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'client-1',
    tenantId: TENANT_ID,
    name: 'Acme Inc',
    industry: null,
    website: null,
    primaryEmail: null,
    primaryPhone: null,
    status: ClientStatus.ACTIVE,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findActiveById: jest.fn(async () => createClientRow()),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    create: jest.fn(async () => createClientRow()),
    update: jest.fn(async () => createClientRow()),
    ...overrides,
  } as unknown as ClientRepository;
}

describe('ClientService', () => {
  describe('create()', () => {
    it('creates a client scoped to the given tenantId, always starting ACTIVE', async () => {
      const repository = createFakeRepository();
      const service = new ClientService(repository);
      const dto = Object.assign(new CreateClientDto(), { name: 'Acme Inc' });

      await service.create(dto, TENANT_ID);

      expect(repository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          name: 'Acme Inc',
          status: ClientStatus.ACTIVE,
        }),
      });
    });
  });

  describe('findById()', () => {
    it('throws NotFoundException when the client does not exist', async () => {
      const repository = createFakeRepository({ findActiveById: jest.fn(async () => null) });
      const service = new ClientService(repository);

      await expect(service.findById('missing', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('throws NotFoundException when the client does not exist', async () => {
      const repository = createFakeRepository({ findActiveById: jest.fn(async () => null) });
      const service = new ClientService(repository);

      await expect(service.update('missing', new UpdateClientDto(), TENANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('can move status to ARCHIVED — the only "delete"-shaped mutation available (no clients:delete route exists)', async () => {
      const repository = createFakeRepository();
      const service = new ClientService(repository);
      const dto = Object.assign(new UpdateClientDto(), { status: ClientStatus.ARCHIVED });

      await service.update('client-1', dto, TENANT_ID);

      expect(repository.update).toHaveBeenCalledWith({
        where: { id: 'client-1' },
        data: expect.objectContaining({ status: ClientStatus.ARCHIVED }),
      });
    });
  });
});
