import { CustomerNoteRepository } from './customer-note.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const customerNote = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const fakePrisma: Record<string, unknown> = { customerNote };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new CustomerNoteRepository(prisma);
}

describe('CustomerNoteRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId and excludes soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('note-1', TENANT_ID);

      expect(prisma.customerNote.findFirst).toHaveBeenCalledWith({
        where: { id: 'note-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause itself', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { customerId: 'cust-1' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.customerNote.findMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });
});
