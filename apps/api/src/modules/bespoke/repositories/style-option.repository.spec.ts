import { StyleOptionRepository } from './style-option.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const styleOption = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const styleOptionGroup = {
    findFirst: jest.fn(async () => null),
  };
  const styleOptionIncompatibility = {
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async () => ({ count: 0 })),
    findMany: jest.fn(async () => []),
  };
  return {
    styleOption,
    styleOptionGroup,
    styleOptionIncompatibility,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new StyleOptionRepository(prisma);
}

describe('StyleOptionRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId, excluding soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('so-1', TENANT_ID);

      expect(prisma.styleOption.findFirst).toHaveBeenCalledWith({
        where: { id: 'so-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findGroupById()', () => {
    it('queries styleOptionGroup.findFirst() scoped to tenantId, including its productCustomization', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findGroupById('group-1', TENANT_ID);

      expect(prisma.styleOptionGroup.findFirst).toHaveBeenCalledWith({
        where: { id: 'group-1', tenantId: TENANT_ID },
        include: { productCustomization: true },
      });
    });
  });

  describe('setIncompatibilities()', () => {
    it('deletes existing pairs (both directions) then creates the new set, sorted A<B', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.setIncompatibilities(TENANT_ID, 'so-b', ['so-a', 'so-c']);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.styleOptionIncompatibility.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          OR: [{ styleOptionAId: 'so-b' }, { styleOptionBId: 'so-b' }],
        },
      });
      expect(prisma.styleOptionIncompatibility.createMany).toHaveBeenCalledWith({
        data: [
          { tenantId: TENANT_ID, styleOptionAId: 'so-a', styleOptionBId: 'so-b' },
          { tenantId: TENANT_ID, styleOptionAId: 'so-b', styleOptionBId: 'so-c' },
        ],
      });
    });
  });

  describe('findIncompatibilities()', () => {
    it('queries both directions of the pair', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findIncompatibilities(TENANT_ID, 'so-1');

      expect(prisma.styleOptionIncompatibility.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          OR: [{ styleOptionAId: 'so-1' }, { styleOptionBId: 'so-1' }],
        },
      });
    });
  });
});
