import { AuditService } from './audit.service';
import { AuditRepository } from './repositories/audit.repository';
import { SystemEventSeverity } from '../../../generated/prisma/enums';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

function createAuditLogRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'log-1',
    tenantId: TENANT_ID,
    actorUserId: null,
    action: 'order.created',
    resourceType: 'order',
    resourceId: 'order-1',
    before: null,
    after: null,
    ipAddress: null,
    userAgent: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function createFakeAuditRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    recordEvent: jest.fn(async () => createAuditLogRow()),
    recordSystemEvent: jest.fn(async () => ({})),
    findManyPaginated: jest.fn(async () => ({ items: [], total: 0 })),
    findManyByCursor: jest.fn(async () => ({ items: [], nextCursor: null })),
    ...overrides,
  } as unknown as AuditRepository;
}

describe('AuditService', () => {
  function createService(auditRepository = createFakeAuditRepository()) {
    return new AuditService(auditRepository);
  }

  describe('recordSecurityEvent() / recordBusinessEvent()', () => {
    it('both write to the same AuditLog table via recordEvent()', async () => {
      const auditRepository = createFakeAuditRepository();
      const service = createService(auditRepository);

      await service.recordSecurityEvent(
        { action: 'auth.login_failed', resourceType: 'user' },
        TENANT_ID,
      );
      await service.recordBusinessEvent(
        { action: 'order.created', resourceType: 'order' },
        TENANT_ID,
      );

      expect(auditRepository.recordEvent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          tenantId: TENANT_ID,
          action: 'auth.login_failed',
          resourceType: 'user',
        }),
      );
      expect(auditRepository.recordEvent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          tenantId: TENANT_ID,
          action: 'order.created',
          resourceType: 'order',
        }),
      );
    });
  });

  describe('recordSystemEvent()', () => {
    it('defaults severity to INFO when not given', async () => {
      const auditRepository = createFakeAuditRepository();
      const service = createService(auditRepository);

      await service.recordSystemEvent(
        { type: 'inventory.low_stock', source: 'inventory', summary: 'x' },
        TENANT_ID,
      );

      expect(auditRepository.recordSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, severity: SystemEventSeverity.INFO }),
      );
    });

    it('passes through an explicit severity', async () => {
      const auditRepository = createFakeAuditRepository();
      const service = createService(auditRepository);

      await service.recordSystemEvent(
        {
          type: 'inventory.low_stock',
          source: 'inventory',
          summary: 'x',
          severity: SystemEventSeverity.ERROR,
        },
        TENANT_ID,
      );

      expect(auditRepository.recordSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({ severity: SystemEventSeverity.ERROR }),
      );
    });
  });

  describe('list()', () => {
    it('delegates to findManyPaginated() with defaulted pagination/sorting', async () => {
      const auditRepository = createFakeAuditRepository();
      const service = createService(auditRepository);

      await service.list({} as never, TENANT_ID);

      expect(auditRepository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        {},
        { createdAt: 'desc' },
        0,
        20,
      );
    });

    it('treats a "search" filter as an OR across action/resourceType ("Search")', async () => {
      const auditRepository = createFakeAuditRepository();
      const service = createService(auditRepository);

      await service.list({ search: 'order' } as never, TENANT_ID);

      expect(auditRepository.findManyPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        {
          OR: [
            { action: { contains: 'order', mode: 'insensitive' } },
            { resourceType: { contains: 'order', mode: 'insensitive' } },
          ],
        },
        { createdAt: 'desc' },
        0,
        20,
      );
    });

    it('switches to findManyByCursor() when a cursor is given, leaving findManyPaginated() untouched', async () => {
      const auditRepository = createFakeAuditRepository({
        findManyByCursor: jest.fn(async () => ({
          items: [createAuditLogRow()],
          nextCursor: 'log-0',
        })),
      });
      const service = createService(auditRepository);

      const result = await service.list({ cursor: 'log-1' } as never, TENANT_ID);

      expect(auditRepository.findManyByCursor).toHaveBeenCalledWith(TENANT_ID, {}, 'log-1', 20);
      expect(auditRepository.findManyPaginated).not.toHaveBeenCalled();
      expect(result.nextCursor).toBe('log-0');
      expect(result.total).toBe(1);
    });
  });
});
