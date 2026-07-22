import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PermissionsGuard } from './permissions.guard';
import { AuthorizationService } from '../../authorization/authorization.service';
import { AuditLogger } from '../../logging';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// Same reasoning as roles.guard.spec.ts: the spied Reflector instance is
// what's passed into the guard's constructor, not a second, unrelated one.
function createFakeAuthorizationService(permissionKeys: string[]) {
  return {
    resolvePermissionKeys: jest.fn(async () => permissionKeys),
  } as unknown as AuthorizationService;
}

// Milestone 13 (Security Hardening) — this guard now logs an
// authz.permission_denied AuditEvent via AUDIT_LOGGER on every denial.
function createFakeAuditLogger() {
  return { log: jest.fn() } as unknown as AuditLogger;
}

function createReflector(requiredPermissions: string[] | undefined): Reflector {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredPermissions);
  return reflector;
}

function createExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request as Request }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  it('allows the request when no @Permissions() metadata is present on the route', async () => {
    const authorizationService = createFakeAuthorizationService([]);
    const guard = new PermissionsGuard(
      createReflector(undefined),
      authorizationService,
      createFakeAuditLogger(),
    );
    const context = createExecutionContext({ user: { email: 'user@example.com' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authorizationService.resolvePermissionKeys).not.toHaveBeenCalled();
  });

  it('allows the request when the user holds every required permission', async () => {
    const authorizationService = createFakeAuthorizationService([
      'projects:read',
      'projects:write',
    ]);
    const guard = new PermissionsGuard(
      createReflector(['projects:write']),
      authorizationService,
      createFakeAuditLogger(),
    );
    const request: Partial<Request> = {
      user: { email: 'manager@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('throws ForbiddenException when the user is missing any required permission', async () => {
    const authorizationService = createFakeAuthorizationService(['projects:read']);
    const guard = new PermissionsGuard(
      createReflector(['projects:write']),
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

  it('requires ALL listed permissions (AND semantics), not just one', async () => {
    const authorizationService = createFakeAuthorizationService(['projects:write']);
    const guard = new PermissionsGuard(
      createReflector(['projects:write', 'projects:delete']),
      authorizationService,
      createFakeAuditLogger(),
    );
    const request: Partial<Request> = {
      user: { email: 'manager@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it("resolves permissions by the authenticated user's email, the resolved tenantId, and reuses request.authorizationCache", async () => {
    const authorizationService = createFakeAuthorizationService(['projects:write']);
    const guard = new PermissionsGuard(
      createReflector(['projects:write']),
      authorizationService,
      createFakeAuditLogger(),
    );
    const request: Partial<Request> = {
      user: { email: 'manager@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await guard.canActivate(context);

    expect(authorizationService.resolvePermissionKeys).toHaveBeenCalledWith(
      'manager@example.com',
      TENANT_ID,
      request.authorizationCache,
    );
    expect(request.authorizationCache).toBeDefined();
  });

  // Milestone 13 (Security Hardening) — "Verify security-sensitive
  // operations generate audit records": permission denial.
  it('logs an authz.permission_denied AuditEvent, naming the required and held permissions, on denial', async () => {
    const authorizationService = createFakeAuthorizationService(['projects:read']);
    const auditLogger = createFakeAuditLogger();
    const guard = new PermissionsGuard(
      createReflector(['projects:write']),
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
        event: 'authz.permission_denied',
        action: 'AUTHZ_CHECK',
        actorType: 'user',
        actorId: 'customer@example.com',
        outcome: 'FAILURE',
        metadata: expect.objectContaining({
          requiredPermissions: ['projects:write'],
          heldPermissions: ['projects:read'],
        }),
      }),
    );
  });

  it('does not log an AuditEvent when every required permission is held', async () => {
    const authorizationService = createFakeAuthorizationService(['projects:write']);
    const auditLogger = createFakeAuditLogger();
    const guard = new PermissionsGuard(
      createReflector(['projects:write']),
      authorizationService,
      auditLogger,
    );
    const request: Partial<Request> = {
      user: { email: 'manager@example.com' },
      tenantContext: { tenantId: TENANT_ID },
    };
    const context = createExecutionContext(request);

    await guard.canActivate(context);

    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});
