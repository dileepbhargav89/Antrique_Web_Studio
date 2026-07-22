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
import { ROLES_KEY } from '../decorators/authorization-metadata.constant';
import { AUDIT_LOGGER, AuditLogger } from '../../logging';

// Milestone 3 (Role & Permission Foundation). Reads `@Roles(...)`
// metadata (roles.decorator.ts) via `Reflector`, then asks
// AuthorizationService whether `request.user` — the `RequestUser`
// JwtAuthGuard already attached — holds any of the listed role keys (OR
// semantics, see roles.decorator.ts). Never verifies a JWT itself
// (TokenService remains the only JWT component) and never returns/throws
// 401: that stays JwtAuthGuard's exclusive job. `@UseGuards(JwtAuthGuard,
// RolesGuard)` — guard array order is execution order — is the contract
// this guard trusts rather than re-checks: if `request.user` were ever
// missing here, JwtAuthGuard didn't run first, which is a route
// misconfiguration bug, not a request this guard is designed to
// gracefully turn into a 401 itself.
//
// No metadata at all (`@Roles()` never applied to this route) means
// nothing to enforce — returns true, matching the "guards are opt-in per
// route" pattern JwtAuthGuard itself already established.
//
// Milestone 4 (Organization & Multi-Tenant Foundation): also reads
// `request.tenantContext` (`TenantMiddleware`, `tenant/` — populated for
// EVERY request, not just guarded ones, so it's always present by the
// time any guard runs) and passes `tenantId` through to
// AuthorizationService, which now resolves roles within that specific
// tenant rather than a fixed default. This guard still never resolves
// tenant itself — it only reads what the middleware already attached,
// the same "trust, don't re-derive" relationship it already has with
// JwtAuthGuard's `request.user`.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
    @Inject(AUDIT_LOGGER) private readonly auditLogger: AuditLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    // Non-null: only reachable when JwtAuthGuard already ran and
    // succeeded (see this class's header comment).
    const user = request.user!;
    // Non-null: TenantMiddleware runs for every request application-wide
    // (tenant/tenant.module.ts's `forRoutes('*')`), well before any guard.
    const tenant = request.tenantContext!;

    request.authorizationCache ??= {};
    const roleKeys = await this.authorizationService.resolveRoleKeys(
      user.email,
      tenant.tenantId,
      request.authorizationCache,
    );

    const hasRequiredRole = requiredRoles.some((role) => roleKeys.includes(role));
    if (!hasRequiredRole) {
      // Milestone 13 (Security Hardening) — "Verify security-sensitive
      // operations generate audit records": permission denial. Logged
      // here, not centrally in ExceptionLoggingFilter — that filter logs
      // every unhandled exception generically (already covers this
      // ForbiddenException too), but only THIS guard knows the semantic
      // "which role(s) were required and which the caller actually
      // held," the information an access-control audit trail actually
      // needs, not just "a 403 happened."
      this.auditLogger.log({
        event: 'authz.role_denied',
        action: 'AUTHZ_CHECK',
        resource: request.path,
        actorType: 'user',
        actorId: user.email,
        outcome: 'FAILURE',
        metadata: { tenantId: tenant.tenantId, requiredRoles, heldRoles: roleKeys },
      });
      throw new ForbiddenException();
    }
    return true;
  }
}
