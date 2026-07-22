import { ReportRepository } from './report.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const scheduledReport = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const fakePrisma: Record<string, unknown> = { scheduledReport };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new ReportRepository(prisma);
}

describe('ReportRepository', () => {
  describe('findById()', () => {
    it('queries findFirst() scoped to tenantId (no deletedAt filter — ScheduledReport is append-only)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findById('report-1', TENANT_ID);

      expect(prisma.scheduledReport.findFirst).toHaveBeenCalledWith({
        where: { id: 'report-1', tenantId: TENANT_ID },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId into the where clause', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { type: 'SALES_SUMMARY' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.scheduledReport.findMany).toHaveBeenCalledWith({
        where: { type: 'SALES_SUMMARY', tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });
});
