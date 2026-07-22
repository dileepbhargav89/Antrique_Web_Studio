import { Injectable } from '@nestjs/common';
import { PingResponseDto } from './dto/ping-response.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { OrganizationContext } from '../../types/organization-context.type';

// Reference implementation for Phase 1.2D's module template — every real
// future domain service (Auth, Users, Organizations, ...) follows this
// same shape: a plain, constructor-injectable class, no DI token/interface
// unless a genuine swap point exists (see
// docs/architecture/domain-module-guide.md "Dependency injection rules").
// This phase deliberately contains zero business logic, zero database
// access, and zero external calls — only the one placeholder method the
// controller actually needs. `ping()` takes the caller's email as a plain
// parameter (Milestone 2) rather than reading `@CurrentUser()` itself —
// that's an HTTP-layer concern the controller resolves and passes in,
// keeping this service ignorant of guards/decorators entirely.
@Injectable()
export class ExampleDomainService {
  ping(authenticatedAs: string): PingResponseDto {
    return new PingResponseDto(authenticatedAs);
  }

  // Milestone 4 (Organization & Multi-Tenant Foundation) — takes the
  // already-resolved tenantId/OrganizationContext as plain parameters
  // (mirroring ping()'s own "controller resolves, service stays ignorant
  // of guards/decorators" convention), no data access of its own: the
  // real lookup already happened once in TenantMiddleware, this just
  // shapes the response.
  organization(tenantId: string, organization: OrganizationContext): OrganizationResponseDto {
    return new OrganizationResponseDto(tenantId, organization);
  }
}
