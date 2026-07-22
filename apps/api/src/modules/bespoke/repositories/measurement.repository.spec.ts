import { MeasurementRepository } from './measurement.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const measurementProfile = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const measurement = {
    deleteMany: jest.fn(async () => ({ count: 0 })),
    createMany: jest.fn(async () => ({ count: 0 })),
  };
  const user = {
    findFirst: jest.fn(async () => null),
  };
  return {
    measurementProfile,
    measurement,
    user,
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new MeasurementRepository(prisma);
}

describe('MeasurementRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId, excluding soft-deleted rows, with measurements included', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('mp-1', TENANT_ID);

      expect(prisma.measurementProfile.findFirst).toHaveBeenCalledWith({
        where: { id: 'mp-1', tenantId: TENANT_ID, deletedAt: null },
        include: { measurements: true },
      });
    });
  });

  describe('replaceMeasurements()', () => {
    it('deletes existing measurements then creates the new set in one transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.replaceMeasurements(TENANT_ID, 'mp-1', [
        { name: 'Chest', value: '40.00', unit: 'IN' as never },
      ]);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.measurement.deleteMany).toHaveBeenCalledWith({
        where: { measurementProfileId: 'mp-1', tenantId: TENANT_ID },
      });
      expect(prisma.measurement.createMany).toHaveBeenCalledWith({
        data: [
          {
            name: 'Chest',
            value: '40.00',
            unit: 'IN',
            tenantId: TENANT_ID,
            measurementProfileId: 'mp-1',
          },
        ],
      });
    });
  });

  describe('userBelongsToTenant()', () => {
    it('returns true when a matching, non-deleted user is found', async () => {
      const prisma = createFakePrisma();
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-1' });
      const repository = createRepository(prisma);

      const result = await repository.userBelongsToTenant('user-1', TENANT_ID);

      expect(result).toBe(true);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', tenantId: TENANT_ID, deletedAt: null },
        select: { id: true },
      });
    });

    it('returns false when no matching user is found', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      const result = await repository.userBelongsToTenant('missing-user', TENANT_ID);

      expect(result).toBe(false);
    });
  });
});
