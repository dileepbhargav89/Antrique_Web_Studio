import { LeadRepository } from './lead.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  const lead = {
    findFirst: jest.fn(async () => null),
    findMany: jest.fn(async () => []),
    create: jest.fn(async () => ({}) as unknown),
    update: jest.fn(async () => ({}) as unknown),
    count: jest.fn(async () => 0),
  };
  const leadSource = {
    findFirst: jest.fn(async () => null),
  };
  const fakePrisma: Record<string, unknown> = { lead, leadSource };
  fakePrisma.$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: unknown) => Promise<unknown>)(fakePrisma);
    }
    return Promise.all(arg as Promise<unknown>[]);
  });
  return fakePrisma as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new LeadRepository(prisma);
}

describe('LeadRepository', () => {
  describe('findActiveById()', () => {
    it('queries findFirst() scoped to tenantId and excludes soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveById('lead-1', TENANT_ID);

      expect(prisma.lead.findFirst).toHaveBeenCalledWith({
        where: { id: 'lead-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });

  describe('findManyPaginated()', () => {
    it('merges tenantId/deletedAt into the where clause itself', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findManyPaginated(
        TENANT_ID,
        { status: 'NEW' } as never,
        { createdAt: 'desc' } as never,
        0,
        20,
      );

      expect(prisma.lead.findMany).toHaveBeenCalledWith({
        where: { status: 'NEW', tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findActiveByEmail()', () => {
    it('scopes to tenant, email, and only non-terminal ("active") statuses', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveByEmail('a@example.com', TENANT_ID);

      expect(prisma.lead.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TENANT_ID,
          contactEmail: 'a@example.com',
          status: { in: ['NEW', 'QUALIFIED', 'QUOTED'] },
          deletedAt: null,
        },
      });
    });

    it('excludes the given leadId when checking for self-collision on update', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveByEmail('a@example.com', TENANT_ID, 'lead-1');

      expect(prisma.lead.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: { not: 'lead-1' } }) }),
      );
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
    it('updates the lead via the given tx client', async () => {
      const fakeTx = { lead: { update: jest.fn(async () => ({})) } } as never;
      const repository = createRepository();

      await repository.updateInTx(fakeTx, 'lead-1', { status: 'CONVERTED' } as never);

      expect((fakeTx as { lead: { update: jest.Mock } }).lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { status: 'CONVERTED' },
      });
    });
  });

  describe('createInTx()', () => {
    it('creates the lead via the given tx client', async () => {
      const fakeTx = { lead: { create: jest.fn(async () => ({ id: 'lead-1' })) } } as never;
      const repository = createRepository();

      await repository.createInTx(fakeTx, { tenantId: TENANT_ID, contactName: 'Jordan' } as never);

      expect((fakeTx as { lead: { create: jest.Mock } }).lead.create).toHaveBeenCalledWith({
        data: { tenantId: TENANT_ID, contactName: 'Jordan' },
      });
    });
  });

  describe('findActiveLeadSourceById()', () => {
    it('queries findFirst() scoped to tenantId and excludes soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveLeadSourceById('source-1', TENANT_ID);

      expect(prisma.leadSource.findFirst).toHaveBeenCalledWith({
        where: { id: 'source-1', tenantId: TENANT_ID, deletedAt: null },
      });
    });
  });
});
