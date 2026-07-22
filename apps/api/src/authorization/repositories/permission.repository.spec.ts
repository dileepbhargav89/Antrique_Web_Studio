import { PermissionRepository } from './permission.repository';
import { PrismaService } from '../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const OTHER_TENANT_ID = '00000000-0000-7000-8000-000000000099';

function createFakePrisma() {
  return {
    permission: {
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
  return new PermissionRepository(prisma);
}

describe('PermissionRepository', () => {
  it('delegates findMany() to prisma.permission.findMany()', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findMany({ where: { key: 'projects:read' } });

    expect(prisma.permission.findMany).toHaveBeenCalledWith({ where: { key: 'projects:read' } });
  });

  describe('findPermissionsForRoles()', () => {
    it('queries findMany() joined through rolePermissions, scoped to the given role ids and tenant', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findPermissionsForRoles(['role-1', 'role-2'], TENANT_ID);

      expect(prisma.permission.findMany).toHaveBeenCalledWith({
        where: {
          rolePermissions: {
            some: {
              roleId: { in: ['role-1', 'role-2'] },
              tenantId: TENANT_ID,
            },
          },
        },
      });
    });

    it('scopes to whatever tenant ID it is called with', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findPermissionsForRoles(['role-1'], OTHER_TENANT_ID);

      expect(prisma.permission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rolePermissions: expect.objectContaining({
              some: expect.objectContaining({ tenantId: OTHER_TENANT_ID }),
            }),
          }),
        }),
      );
    });
  });
});
