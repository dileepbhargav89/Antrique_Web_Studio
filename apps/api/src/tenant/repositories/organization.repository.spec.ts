import { OrganizationRepository } from './organization.repository';
import { PrismaService } from '../../database/prisma.service';
import { TenantStatus } from '../../../generated/prisma/enums';

// Same reasoning as modules/auth/repositories/auth.repository.spec.ts — a
// plain fake exposing only `prisma.tenant` is enough to prove the wiring,
// no real PrismaService/Postgres involved.
function createFakePrisma() {
  return {
    tenant: {
      findUnique: jest.fn(async () => null),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => ({}) as unknown),
      update: jest.fn(async () => ({}) as unknown),
      delete: jest.fn(async () => ({}) as unknown),
    },
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new OrganizationRepository(prisma);
}

describe('OrganizationRepository', () => {
  it('delegates findMany() to prisma.tenant.findMany()', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findMany({ where: { slug: 'antrique' } });

    expect(prisma.tenant.findMany).toHaveBeenCalledWith({ where: { slug: 'antrique' } });
  });

  describe('findActiveBySlug()', () => {
    it('queries findFirst() by slug, requiring ACTIVE status and excluding soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveBySlug('antrique');

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
        where: { slug: 'antrique', status: TenantStatus.ACTIVE, deletedAt: null },
      });
    });
  });

  describe('findActiveById()', () => {
    it('queries findFirst() by id, requiring ACTIVE status and excluding soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('00000000-0000-7000-8000-000000000001');

      expect(prisma.tenant.findFirst).toHaveBeenCalledWith({
        where: {
          id: '00000000-0000-7000-8000-000000000001',
          status: TenantStatus.ACTIVE,
          deletedAt: null,
        },
      });
    });
  });
});
