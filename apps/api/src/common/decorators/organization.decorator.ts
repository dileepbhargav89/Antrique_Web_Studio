import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { OrganizationContext } from '../../types/organization-context.type';

// Same shape as tenant.decorator.ts's extractTenant()/Tenant split — see
// that file's comment for the reasoning.
export function extractOrganization(context: ExecutionContext): OrganizationContext | undefined {
  const request = context.switchToHttp().getRequest<Request>();
  return request.organizationContext;
}

// Milestone 4 — reads the richer, display-oriented OrganizationContext
// TenantMiddleware attaches alongside TenantContext (one resolution, two
// views — see tenant/middleware/tenant.middleware.ts). Used where a
// caller needs to *show* organization details, not scope a query — see
// modules/example-domain/example-domain.controller.ts's
// `GET /example/organization`, the one route this decorator is wired
// into so far.
export const Organization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrganizationContext | undefined =>
    extractOrganization(ctx),
);
