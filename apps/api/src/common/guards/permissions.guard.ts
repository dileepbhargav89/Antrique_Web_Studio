import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthorizationService } from '../../authorization/authorization.service';
import { PERMISSIONS_KEY } from '../decorators/authorization-metadata.constant';
import { AUDIT_LOGGER, AuditLogger } from '../../logging';

// Milestone 3 (Role & Permission Foundation) — same shape as RolesGuard,
// checking `@Permissions(...)` metadata instead: `request.user` must hold
// ALL listed permission keys (AND semantics, see permissions.decorator.ts),
// not just one. Same invariants as RolesGuard: never verifies a JWT
// itself, never returns/throws 401 (JwtAuthGuard's exclusive job, and
// this guard trusts it already ran first per `@UseGuards(JwtAuthGuard,
// PermissionsGuard)` ordering), returns true when no `@Permissions()`
// metadata is present on the route.
//
// Milestone 4: also reads `request.tenantContext` and passes `tenantId`
// through to AuthorizationService — see RolesGuard's identical comment.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
    @Inject(AUDIT_LOGGER) private readonly auditLogger: AuditLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    // Non-null: only reachable when JwtAuthGuard already ran and
    // succeeded (see RolesGuard's identical reasoning).
    const user = request.user!;
    // Non-null: TenantMiddleware runs for every request application-wide
    // (tenant/tenant.module.ts's `forRoutes('*')`), well before any guard.
    const tenant = request.tenantContext!;

    request.authorizationCache ??= {};
    const permissionKeys = await this.authorizationService.resolvePermissionKeys(
      user.email,
      tenant.tenantId,
      request.authorizationCache,
    );

    const hasAllRequiredPermissions = requiredPermissions.every((permission) =>
      permissionKeys.includes(permission),
    );
    if (!hasAllRequiredPermissions) {
      // Milestone 13 (Security Hardening) — same reasoning as
      // RolesGuard's own identical addition: this guard is the only
      // place that knows which permission(s) were required vs. actually
      // held, the information an access-control audit trail needs.
      this.auditLogger.log({
        event: 'authz.permission_denied',
        action: 'AUTHZ_CHECK',
        resource: request.path,
        actorType: 'user',
        actorId: user.email,
        outcome: 'FAILURE',
        metadata: {
          tenantId: tenant.tenantId,
          requiredPermissions,
          heldPermissions: permissionKeys,
        },
      });
      throw new ForbiddenException();
    }
    return true;
  }
}
