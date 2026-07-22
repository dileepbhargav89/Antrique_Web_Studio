import { OrganizationContext } from '../../../types/organization-context.type';

// Response DTO for GET /example/organization (Milestone 4 — Organization
// & Multi-Tenant Foundation) — the reference example for
// TenantContext/OrganizationContext, the same role ping-response.dto.ts
// played for RequestUser in Milestone 2. `tenantId` and `organization`
// are deliberately both present even though `organization.id` is the
// same value: `tenantId` demonstrates the minimal `TenantContext` a
// query-scoping call site would use; `organization` demonstrates the
// richer `OrganizationContext` a display call site would use — showing
// both real, distinct decorators (`@Tenant()`/`@Organization()`) doing
// their own separate jobs, not collapsing them into one field.
export class OrganizationResponseDto {
  constructor(
    readonly tenantId: string,
    readonly organization: OrganizationContext,
  ) {}
}
