import { AuditRepository } from './audit.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const auditLog = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const systemEvent = {
    create: jest.fn(async () => ({}) as unknown),
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
  };
  const fakePrisma: Record<string, unknown> = { auditLog, systemEvent };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new AuditRepository(prisma);
}

describe('AuditRepository', () => {
  describe('findById()', () => {
    it('queries findFirst() scoped to tenantId (no deletedAt filter — AuditLog is append-only)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findById('log-1', TENANT_ID);

      expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
        where: { id: 'log-1', tenantId: TENANT_ID },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId into the where clause', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { action: 'order.created' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: 'order.created', tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findManyByCursor()', () => {
    it('queries id DESC with no id filter when cursor is absent (first page)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyByCursor(
        TENANT_ID,
        { action: 'order.created' } as never,
        undefined,
        20,
      );

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: 'order.created', tenantId: TENANT_ID },
        orderBy: { id: 'desc' },
        take: 21,
      });
    });

    it('adds an id < cursor filter when a cursor is given', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyByCursor(TENANT_ID, {} as never, 'log-20', 20);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, id: { lt: 'log-20' } },
        orderBy: { id: 'desc' },
        take: 21,
      });
    });

    it('returns nextCursor as the last item id and trims the extra lookahead row when more pages exist', async () => {
      const rows = Array.from({ length: 21 }, (_, i) => ({ id: `log-${20 - i}` }));
      const prisma = createFakePrisma();
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValueOnce(rows);
      const repository = createRepository(prisma);

      const result = await repository.findManyByCursor(TENANT_ID, {} as never, undefined, 20);

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe('log-1');
    });

    it('returns nextCursor null when fewer rows than the page size come back (last page)', async () => {
      const rows = [{ id: 'log-2' }, { id: 'log-1' }];
      const prisma = createFakePrisma();
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValueOnce(rows);
      const repository = createRepository(prisma);

      const result = await repository.findManyByCursor(TENANT_ID, {} as never, undefined, 20);

      expect(result.items).toEqual(rows);
      expect(result.nextCursor).toBeNull();
    });
  });

  describe('recordEvent()', () => {
    it('creates an AuditLog row from the given data', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const data = {
        tenantId: TENANT_ID,
        action: 'notification.retry',
        resourceType: 'notification',
      } as never;

      await repository.recordEvent(data);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('recordSystemEvent()', () => {
    it('reaches prisma.systemEvent directly to create a SystemEvent row', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const data = {
        tenantId: TENANT_ID,
        type: 'inventory.low_stock',
        source: 'inventory',
        summary: 'x',
      } as never;

      await repository.recordSystemEvent(data);

      expect(prisma.systemEvent.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('findSystemEventsPaginated()', () => {
    it('merges tenantId into the where clause and runs count()/findMany() in one transaction', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findSystemEventsPaginated(
        TENANT_ID,
        { severity: 'ERROR' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.systemEvent.findMany).toHaveBeenCalledWith({
        where: { severity: 'ERROR', tenantId: TENANT_ID },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
      expect(prisma.systemEvent.count).toHaveBeenCalledWith({
        where: { severity: 'ERROR', tenantId: TENANT_ID },
      });
    });
  });

  describe('countSystemEventsBySeverity()', () => {
    it('counts SystemEvent rows scoped to tenant/severity, with an optional since floor', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const since = new Date('2026-07-20T00:00:00.000Z');

      await repository.countSystemEventsBySeverity(TENANT_ID, 'ERROR' as never, since);

      expect(prisma.systemEvent.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, severity: 'ERROR', createdAt: { gte: since } },
      });
    });

    it('omits the createdAt filter when since is not given', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.countSystemEventsBySeverity(TENANT_ID, 'ERROR' as never);

      expect(prisma.systemEvent.count).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, severity: 'ERROR' },
      });
    });
  });
});
