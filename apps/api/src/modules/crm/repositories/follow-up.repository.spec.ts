import { FollowUpRepository } from './follow-up.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const followUpTask = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const fakePrisma: Record<string, unknown> = { followUpTask };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new FollowUpRepository(prisma);
}

describe('FollowUpRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId and excludes soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('task-1', TENANT_ID);

      expect(prisma.followUpTask.findFirst).toHaveBeenCalledWith({
        where: { id: 'task-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause itself', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { status: 'PENDING' } as never,
        { dueAt: 'asc' } as never,
        0,
        20,
      );

      expect(prisma.followUpTask.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { dueAt: 'asc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('runInTransaction()', () => {
    it('delegates to prisma.$transaction() with the given callback', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const work = jest.fn(async () => 'result');

      const result = await repository.runInTransaction(work);

      expect(prisma.$transaction).toHaveBeenCalledWith(work);
      expect(result).toBe('result');
    });
  });

  describe('updateInTx()', () => {
    it('updates the follow-up via the given tx client', async () => {
      const fakeTx = { followUpTask: { update: jest.fn(async () => ({})) } } as never;
      const repository = createRepository();

      await repository.updateInTx(fakeTx, 'task-1', { status: 'COMPLETED' } as never);

      expect(
        (fakeTx as { followUpTask: { update: jest.Mock } }).followUpTask.update,
      ).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'COMPLETED' },
      });
    });
  });
});
