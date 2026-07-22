import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RolesGuard } from './roles.guard';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AuditLogger } from '../../logging';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// AuthorizationService faked, not real — this guard's own contract is
// "read metadata, delegate to AuthorizationService, translate the answer
// into allow/403," not role/permission resolution itself (that's
// authorization.service.spec.ts's job). Reflector is real (a plain class,
// no DI needed) since a fake would just be reimplementing
// getAllAndOverride() badly — its `getAllAndOverride()` method is spied
// per-test instead, and the SAME spied instance is what's passed into the
// guard's constructor below (not a second, unrelated Reflector), so the
// mocked return value is actually what the guard under test reads.
function createFakeAuthorizationService(roleKeys: string[]) {
  return {
    resolveRoleKeys: jest.fn(async () => roleKeys),
  } as unknown as AuthorizationService;
}

// Milestone 13 (Security Hardening) — this guard now logs an
// authz.role_denied AuditEvent via AUDIT_LOGGER on every denial.
function createFakeAuditLogger() {
  return { log: jest.fn() } as unknown as AuditLogger;
}

function createReflector(requiredRoles: string[] | undefined): Reflector {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
  return reflector;
}

// `tenantContext` defaults to a fixed tenant, mirroring what
// TenantMiddleware always attaches before any guard runs (Milestone 4 —
// Organization & Multi-Tenant Foundation) — omit it only for the "no
// metadata" case, which returns before ever reading it.
function createExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request as Request }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows the request when no @Roles() metadata is present on the route', async () => {
    const authorizationService = createFakeAuthorizationService([]);
    const guard = new RolesGuard(
      createReflector(undefined),
      authorizationService,
      createFakeAuditLogger(),
    );
    const context = createExecutionContext({ user: { email: 'user@example.com' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authorizationService.resolveRoleKeys).not.toHaveBeenCalled();
  });

  it('allows the request when the user holds one of the required roles', async () => {
    const authorizationService = createFakeAuthorizationService(['admin']);
    const guard = new RolesGuard(
      createReflector(['admin', 'super_admin']),
      authorizationService,
      createFakeAuditLogger(),
    );
    const request: Partial<Request> = {
      user: { email: 'admin@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('throws ForbiddenException when the user holds none of the required roles', async () => {
    const authorizationService = createFakeAuthorizationService(['customer']);
    const guard = new RolesGuard(
      createReflector(['admin', 'super_admin']),
      authorizationService,
      createFakeAuditLogger(),
    );
    const request: Partial<Request> = {
      user: { email: 'customer@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it("resolves roles by the authenticated user's email, the resolved tenantId, and reuses request.authorizationCache", async () => {
    const authorizationService = createFakeAuthorizationService(['admin']);
    const guard = new RolesGuard(
      createReflector(['admin']),
      authorizationService,
      createFakeAuditLogger(),
    );
    const request: Partial<Request> = {
      user: { email: 'admin@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await guard.canActivate(context);

    expect(authorizationService.resolveRoleKeys).toHaveBeenCalledWith(
      'admin@example.com',
      TENANT_ID,
      request.authorizationCache,
    );
    expect(request.authorizationCache).toBeDefined();
  });

  // Milestone 13 (Security Hardening) — "Verify security-sensitive
  // operations generate audit records": permission denial.
  it('logs an authz.role_denied AuditEvent, naming the required and held roles, on denial', async () => {
    const authorizationService = createFakeAuthorizationService(['customer']);
    const auditLogger = createFakeAuditLogger();
    const guard = new RolesGuard(
      createReflector(['admin', 'super_admin']),
      authorizationService,
      auditLogger,
    );
    const request: Partial<Request> = {
      user: { email: 'customer@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await guard.canActivate(context).catch(() => {});

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'authz.role_denied',
        action: 'AUTHZ_CHECK',
        actorType: 'user',
        actorId: 'customer@example.com',
        outcome: 'FAILURE',
        metadata: expect.objectContaining({
          requiredRoles: ['admin', 'super_admin'],
          heldRoles: ['customer'],
        }),
      }),
    );
  });

  it('does not log an AuditEvent when the required role is held', async () => {
    const authorizationService = createFakeAuthorizationService(['admin']);
    const auditLogger = createFakeAuditLogger();
    const guard = new RolesGuard(createReflector(['admin']), authorizationService, auditLogger);
    const request: Partial<Request> = {
      user: { email: 'admin@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await guard.canActivate(context);

    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});
