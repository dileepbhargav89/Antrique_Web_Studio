import { SessionRepository } from './session.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createFakePrisma() {
  return {
    session: {
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => ({}) as unknown),
      update: jest.fn(async () => ({}) as unknown),
      updateMany: jest.fn(async () => ({ count: 0 }) as unknown),
      deleteMany: jest.fn(async () => ({ count: 0 }) as unknown),
      count: jest.fn(async () => 0),
    },
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new SessionRepository(prisma);
}

describe('SessionRepository', () => {
  it('createSession() delegates to prisma.session.create()', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);
    const data = {
      tenantId: TENANT_ID,
      userId: 'u1',
      refreshTokenHash: 'hash',
      expiresAt: new Date(),
    };

    await repository.createSession(data);

    expect(prisma.session.create).toHaveBeenCalledWith({ data });
  });

  it('findByRefreshTokenHash() queries by hash + tenantId, regardless of revocation state', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findByRefreshTokenHash('hash', TENANT_ID);

    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: { refreshTokenHash: 'hash', tenantId: TENANT_ID },
    });
  });

  it('markRotated() revokes the old session and links replacedBySessionId', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.markRotated('old-id', 'new-id');

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'old-id' },
      data: {
        revokedAt: expect.any(Date),
        replacedBySessionId: 'new-id',
        lastUsedAt: expect.any(Date),
      },
    });
  });

  it('revoke() sets revokedAt', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.revoke('s1');

    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('revokeAllActiveForUser() bulk-revokes every currently-active session for that user', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.revokeAllActiveForUser('u1');

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('findActiveForUser() filters to unrevoked, unexpired sessions for the tenant, newest first', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findActiveForUser('u1', TENANT_ID);

    expect(prisma.session.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        tenantId: TENANT_ID,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      orderBy: { issuedAt: 'desc' },
    });
  });

  it('countActiveForUser() counts unrevoked, unexpired sessions', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.countActiveForUser('u1');

    expect(prisma.session.count).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null, expiresAt: { gt: expect.any(Date) } },
    });
  });

  it('findOldestActiveForUser() orders ascending to surface the single oldest session', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findOldestActiveForUser('u1');

    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null, expiresAt: { gt: expect.any(Date) } },
      orderBy: { issuedAt: 'asc' },
    });
  });

  it('findActiveByIdForUser() scopes by id + userId + tenantId, unrevoked and unexpired', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findActiveByIdForUser('s1', 'u1', TENANT_ID);

    expect(prisma.session.findFirst).toHaveBeenCalledWith({
      where: {
        id: 's1',
        userId: 'u1',
        tenantId: TENANT_ID,
        revokedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
    });
  });

  // Phase 10, Module 7 (Background Jobs).
  describe('deleteExpired()', () => {
    it('deletes only rows past their own expiresAt, regardless of tenant/revocation state', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.deleteExpired();

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: expect.any(Date) } },
      });
    });

    it('resolves the deleted row count', async () => {
      const prisma = createFakePrisma();
      (prisma.session.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 42 });
      const repository = createRepository(prisma);

      await expect(repository.deleteExpired()).resolves.toBe(42);
    });
  });
});
