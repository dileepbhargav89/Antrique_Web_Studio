import { AuthRepository } from './auth.repository';
import { PrismaService } from '../../../database/prisma.service';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';
const OTHER_TENANT_ID = '00000000-0000-7000-8000-000000000099';

function createFakePrisma() {
  return {
    user: {
      findUnique: jest.fn(async () => null),
      findFirst: jest.fn(async () => null),
      findMany: jest.fn(async () => []),
      create: jest.fn(async () => ({}) as unknown),
      update: jest.fn(async () => ({}) as unknown),
      delete: jest.fn(async () => ({}) as unknown),
    },
  } as unknown as PrismaService;
}

function createRepository(prisma = createFakePrisma()) {
  return new AuthRepository(prisma);
}

describe('AuthRepository', () => {
  it('delegates findMany() to prisma.user.findMany()', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findMany({ where: { email: 'user@example.com' } });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
    });
  });

  it('delegates findOne() to prisma.user.findUnique()', async () => {
    const prisma = createFakePrisma();
    const repository = createRepository(prisma);

    await repository.findOne({ where: { id: 'u1' } });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  describe('findActiveByEmail()', () => {
    it('queries findFirst() scoped to the given tenantId, excluding soft-deleted rows', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveByEmail('user@example.com', TENANT_ID);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: { equals: 'user@example.com', mode: 'insensitive' },
          tenantId: TENANT_ID,
          deletedAt: null,
        },
      });
    });

    it('scopes to whatever tenant ID it is called with', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveByEmail('user@example.com', OTHER_TENANT_ID);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tenantId: OTHER_TENANT_ID }) }),
      );
    });

    it("uses case-insensitive matching, mirroring the database's own LOWER(email) uniqueness constraint", async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.findActiveByEmail('User@Example.com', TENANT_ID);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { equals: 'User@Example.com', mode: 'insensitive' },
          }),
        }),
      );
    });
  });

  // Phase 10, Module 4 (Authentication & Session Security) — account
  // lockout bookkeeping.
  describe('recordFailedLogin()', () => {
    it('increments failedLoginAttempts and leaves lockedUntil untouched when no lockUntil is given', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.recordFailedLogin('u1', 2, null);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 3 },
      });
    });

    it('sets lockedUntil when a lock date is given (threshold reached)', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);
      const lockUntil = new Date('2026-01-01T00:00:00.000Z');

      await repository.recordFailedLogin('u1', 4, lockUntil);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 5, lockedUntil: lockUntil },
      });
    });
  });

  describe('recordSuccessfulLogin()', () => {
    it('resets failedLoginAttempts and lockedUntil back to their defaults', async () => {
      const prisma = createFakePrisma();
      const repository = createRepository(prisma);

      await repository.recordSuccessfulLogin('u1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    });
  });
});
