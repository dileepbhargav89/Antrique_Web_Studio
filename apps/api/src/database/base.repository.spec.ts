import { BaseRepository } from './base.repository';

// The minimal shape `findManyAndCount()` needs from a transaction-capable
// client — mirrors `TransactionCapable` in base.repository.ts itself
// (not imported directly: that type isn't exported, deliberately, since
// it's an internal implementation detail of the one method that uses
// it, not part of BaseRepository's own public contract).
type MockTransactionClient = {
  $transaction<T extends readonly unknown[]>(ops: readonly [...T]): Promise<T>;
};

// A plain mock delegate — no real Prisma/Postgres involved. This is
// exactly what makes BaseRepository trivially testable: it depends only
// on the delegate object shape, never on PrismaService or a live
// connection (see the class's own header comment).
type FakeRecord = { id: string; name: string };

function createMockDelegate() {
  return {
    findUnique: jest.fn(async (_args: { where: Record<string, unknown> }) => {
      return { id: '1', name: 'a' } as FakeRecord | null;
    }),
    findMany: jest.fn(async (_args?: Record<string, unknown>) => {
      return [{ id: '1', name: 'a' }] as FakeRecord[];
    }),
    create: jest.fn(async (_args: { data: Record<string, unknown> }) => {
      return { id: '2', name: 'b' } as FakeRecord;
    }),
    update: jest.fn(
      async (_args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        return { id: '1', name: 'updated' } as FakeRecord;
      },
    ),
    delete: jest.fn(async (_args: { where: Record<string, unknown> }) => {
      return { id: '1', name: 'a' } as FakeRecord;
    }),
    count: jest.fn(async (_args?: Record<string, unknown>) => {
      return 1;
    }),
  };
}

// A plain mock transaction-capable client — `findManyAndCount()` needs
// only `$transaction()`, never a real PrismaService, the same "depends on
// the minimal shape, not the concrete class" discipline the delegate mock
// above already follows.
function createMockTransactionClient(): MockTransactionClient & { $transaction: jest.Mock } {
  const $transaction = jest.fn(async (ops: readonly unknown[]) => Promise.all(ops));
  return { $transaction } as unknown as MockTransactionClient & { $transaction: jest.Mock };
}

// BaseRepository is abstract — a minimal concrete subclass is the only
// way to instantiate it, same as any real repository would.
// `paginate()` is a thin public wrapper exposing the otherwise-`protected`
// `findManyAndCount()` — every real repository calls it exactly this way,
// from within its own subclass.
class TestRepository extends BaseRepository<ReturnType<typeof createMockDelegate>> {
  constructor(delegate: ReturnType<typeof createMockDelegate>) {
    super(delegate);
  }

  paginate(
    transactionClient: ReturnType<typeof createMockTransactionClient>,
    args: Record<string, unknown>,
  ) {
    return this.findManyAndCount(transactionClient, args);
  }
}

describe('BaseRepository', () => {
  it('findOne() delegates to delegate.findUnique() with the same arguments', async () => {
    const delegate = createMockDelegate();
    const repo = new TestRepository(delegate);

    const result = await repo.findOne({ where: { id: '1' } });

    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(result).toEqual({ id: '1', name: 'a' });
  });

  it('findMany() delegates to delegate.findMany() with the same arguments', async () => {
    const delegate = createMockDelegate();
    const repo = new TestRepository(delegate);

    const result = await repo.findMany({ where: { name: 'a' } });

    expect(delegate.findMany).toHaveBeenCalledWith({ where: { name: 'a' } });
    expect(result).toEqual([{ id: '1', name: 'a' }]);
  });

  it('create() delegates to delegate.create() with the same arguments', async () => {
    const delegate = createMockDelegate();
    const repo = new TestRepository(delegate);

    const result = await repo.create({ data: { name: 'b' } });

    expect(delegate.create).toHaveBeenCalledWith({ data: { name: 'b' } });
    expect(result).toEqual({ id: '2', name: 'b' });
  });

  it('update() delegates to delegate.update() with the same arguments', async () => {
    const delegate = createMockDelegate();
    const repo = new TestRepository(delegate);

    const result = await repo.update({ where: { id: '1' }, data: { name: 'updated' } });

    expect(delegate.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { name: 'updated' } });
    expect(result).toEqual({ id: '1', name: 'updated' });
  });

  it('delete() delegates to delegate.delete() with the same arguments', async () => {
    const delegate = createMockDelegate();
    const repo = new TestRepository(delegate);

    const result = await repo.delete({ where: { id: '1' } });

    expect(delegate.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    expect(result).toEqual({ id: '1', name: 'a' });
  });

  it('count() delegates to delegate.count() with the same arguments (Milestone 5)', async () => {
    const delegate = createMockDelegate();
    const repo = new TestRepository(delegate);

    const result = await repo.count({ where: { name: 'a' } });

    expect(delegate.count).toHaveBeenCalledWith({ where: { name: 'a' } });
    expect(result).toEqual(1);
  });

  // Architecture review (Backend v1.0) — findManyAndCount() consolidates
  // what ~22 repositories previously each hand-wrote as their own
  // findManyPaginated() body (`this.prisma.$transaction([findMany,
  // count])`) — see this method's own comment in base.repository.ts.
  describe('findManyAndCount() (architecture review consolidation)', () => {
    it('runs findMany and count through $transaction with the same args object, and returns { items, total }', async () => {
      const delegate = createMockDelegate();
      const transactionClient = createMockTransactionClient();
      const repo = new TestRepository(delegate);
      const args = { where: { name: 'a' }, orderBy: { name: 'asc' }, skip: 0, take: 20 };

      const result = await repo.paginate(transactionClient, args);

      expect(delegate.findMany).toHaveBeenCalledWith(args);
      expect(delegate.count).toHaveBeenCalledWith({ where: args.where });
      expect(transactionClient.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ items: [{ id: '1', name: 'a' }], total: 1 });
    });

    it('passes an args object with no `where` through as count({ where: undefined })', async () => {
      const delegate = createMockDelegate();
      const transactionClient = createMockTransactionClient();
      const repo = new TestRepository(delegate);

      await repo.paginate(transactionClient, { orderBy: { name: 'asc' }, skip: 0, take: 20 });

      expect(delegate.count).toHaveBeenCalledWith({ where: undefined });
    });
  });
});
