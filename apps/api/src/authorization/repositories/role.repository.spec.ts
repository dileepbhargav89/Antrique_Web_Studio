import { RoleRepository } from './role.repository';
import { PrismaService } from '../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const OTHER_TENANT_ID = '00000000-0000-7000-8000-000000000099';

// Same reasoning as modules/auth/repositories/auth.repository.spec.ts — a
// plain fake exposing only `prisma.role` is enough to prove the wiring,
// no real PrismaService/Postgres involved.
function createFakePrisma() {
  return {
    role: {
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
  return new RoleRepository(prisma);
}

describe('RoleRepository', () => {
  it('delegates findMany() to prisma.role.findMany()', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findMany({ where: { key: 'admin' } });

    expect(prisma.role.findMany).toHaveBeenCalledWith({ where: { key: 'admin' } });
  });

  describe('findRolesForUser()', () => {
    it('queries findMany() joined through userRoles.user by email, tenant-scoped, excluding soft-deleted rows on both sides', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findRolesForUser('user@example.com', TENANT_ID);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          deletedAt: null,
          userRoles: {
            some: {
              user: {
                email: { equals: 'user@example.com', mode: 'insensitive' },
                tenantId: TENANT_ID,
                deletedAt: null,
              },
            },
          },
        },
      });
    });

    it('scopes to whatever tenant ID it is called with', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findRolesForUser('user@example.com', OTHER_TENANT_ID);

      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: OTHER_TENANT_ID }) }),
      );
    });

    it("uses case-insensitive email matching, mirroring findActiveByEmail()'s reasoning", async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findRolesForUser('User@Example.com', TENANT_ID);

      const call = (prisma.role.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.userRoles.some.user.email).toEqual({
        equals: 'User@Example.com',
        mode: 'insensitive',
      });
    });
  });
});
