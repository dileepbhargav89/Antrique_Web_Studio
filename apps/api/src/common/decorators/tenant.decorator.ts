import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { TenantContext } from '../../types/tenant-context.type';

// Same shape as current-user.decorator.ts's extractCurrentUser()/
// CurrentUser split — the raw extraction logic is exported standalone so
// it's directly unit-testable without Nest's param-decorator reflection
// machinery.
export function extractTenant(context: ExecutionContext): TenantContext | undefined {
  const request = context.switchToHttp().getRequest<Request>();
  return request.tenantContext;
}

// Milestone 4 (Organization & Multi-Tenant Foundation) — reads the
// TenantContext TenantMiddleware already attached to
// `request.tenantContext` for EVERY request (unlike @CurrentUser(),
// which only resolves on a route also guarded by JwtAuthGuard, this
// resolves on any route, authenticated or not — TenantMiddleware runs
// for the whole app, not per-route opt-in). Has no resolution logic of
// its own. See `modules/auth/auth.controller.ts`'s `login()` for the one
// route this decorator threads tenant scoping into so far.
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext | undefined => extractTenant(ctx),
);
