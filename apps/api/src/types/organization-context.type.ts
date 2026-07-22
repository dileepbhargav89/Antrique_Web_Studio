// Milestone 4 (Organization & Multi-Tenant Foundation) — the resolved
// tenant's display-oriented details, attached to
// `request.organizationContext` by the same middleware pass that
// attaches `TenantContext` (one resolution, two derived views — see
// `tenant/middleware/tenant.middleware.ts`), read back out via
// `common/decorators/organization.decorator.ts`. Used where a caller
// needs to *show* organization info (e.g. the
// `GET /example/organization` reference endpoint), not to scope a
// query — query-scoping code should depend on the narrower
// `TenantContext` instead, the same way a controller depends on
// `RequestUser` for identity but never needs to *display* a JWT's raw
// claims.
export interface OrganizationContext {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      organizationContext?: OrganizationContext;
    }
  }
}
