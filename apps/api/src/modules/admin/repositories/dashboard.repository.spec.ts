import { DashboardRepository } from './dashboard.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const dashboardWidget = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
  };
  const fakePrisma: Record<string, unknown> = { dashboardWidget };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new DashboardRepository(prisma);
}

describe('DashboardRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId/deletedAt', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('widget-1', TENANT_ID);

      expect(prisma.dashboardWidget.findFirst).toHaveBeenCalledWith({
        where: { id: 'widget-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findActiveWidgets()', () => {
    it('finds active, non-deleted widgets for a tenant, ordered by sortOrder', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveWidgets(TENANT_ID);

      expect(prisma.dashboardWidget.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, deletedAt: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { type: 'KPI' } as never,
        { sortOrder: 'asc' } as never,
        0,
        20,
      );

      expect(prisma.dashboardWidget.findMany).toHaveBeenCalledWith({
        where: { type: 'KPI', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        skip: 0,
        take: 20,
      });
    });
  });
});
