import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { OrganizationRepository } from './repositories/organization.repository';
import appConfig from '../config/app/app.config';
import defaultTenantConfig from './config/default-tenant.config';
import { TENANT_ID_HEADER } from './tenant.constant';

export type TenantResolutionSource = 'hostname' | 'header' | 'default';

export interface ResolvedTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly source: TenantResolutionSource;
}

// The resolution LOGIC only — pure decision-making over a request's
// hostname/headers plus a database lookup, no attachment to `request`
// itself (that's `middleware/tenant.middleware.ts`'s job, the same
// "orchestration vs. logic" split `JwtAuthGuard`/`extractBearerToken`
// already established). Never touches `request.user`/`RequestUser` —
// tenant resolution happens for EVERY request, authenticated or not
// (even `POST /auth/login`, which has no guard and needs a tenant to
// scope its own user lookup against).
//
// Resolution priority, first match wins, each candidate independently
// validated against the database (`OrganizationRepository`'s
// `findActive*` methods — a resolved candidate that doesn't correspond
// to a real, active tenant is treated exactly like "no candidate" and
// falls through to the next priority, never trusted blindly):
//   1. Hostname — the leftmost label of a ≥3-label, non-IP hostname is
//      treated as a candidate `Tenant.slug` (e.g. `acme.antrique.app` →
//      `acme`). `schema.prisma`'s `Tenant` has no dedicated
//      domain/hostname column (Phase 1.1A, unchanged by this
//      milestone — no schema change needed here); subdomain-matching
//      against the existing `slug` column is what "if configured" means
//      in practice — a hostname that doesn't look like a subdomain
//      (`localhost`, an IP, or a bare two-label domain) simply produces
//      no candidate and this priority is skipped, no separate
//      feature-flag needed.
//   2. `X-Tenant-ID` header (development/testing) — the tenant's real
//      `id` (UUID), not its slug; validated the same way.
//   3. `DEFAULT_TENANT_ID` (development only — `tenant/config/
//      default-tenant.config.ts`) — gated strictly on
//      `nodeEnv === 'development'`; a `test`/`production` request that
//      falls through both priorities above gets no fallback.
// Anything left unresolved throws `BadRequestException` — a request
// this app genuinely cannot scope to a tenant is a client/deploy
// configuration error, not something to silently default around,
// especially not in production (silently defaulting there would be a
// cross-tenant data-leak risk, not a convenience).
@Injectable()
export class TenantResolver {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    @Inject(defaultTenantConfig.KEY)
    private readonly defaultTenant: ConfigType<typeof defaultTenantConfig>,
  ) {}

  async resolve(request: Request): Promise<ResolvedTenant> {
    const hostnameCandidate = extractHostnameSlugCandidate(request.hostname);
    if (hostnameCandidate) {
      const tenant = await this.organizationRepository.findActiveBySlug(hostnameCandidate);
      if (tenant) {
        return { id: tenant.id, name: tenant.name, slug: tenant.slug, source: 'hostname' };
      }
    }

    const headerTenantId = firstHeader(request.headers[TENANT_ID_HEADER]);
    if (headerTenantId) {
      const tenant = await this.organizationRepository.findActiveById(headerTenantId);
      if (tenant) {
        return { id: tenant.id, name: tenant.name, slug: tenant.slug, source: 'header' };
      }
    }

    if (this.app.nodeEnv === 'development') {
      const tenant = await this.organizationRepository.findActiveById(this.defaultTenant.id);
      if (tenant) {
        return { id: tenant.id, name: tenant.name, slug: tenant.slug, source: 'default' };
      }
    }

    throw new BadRequestException('Tenant could not be resolved');
  }
}

const IPV4_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

// Exported standalone (not a private method) so this parsing logic —
// the exact boundary between "looks like a tenant subdomain" and
// "doesn't" — is directly unit-testable without a full resolver/request
// mock for every edge case, the same reasoning
// `jwt-auth.guard.ts`'s `extractBearerToken()` was exported standalone.
export function extractHostnameSlugCandidate(hostname: string | undefined): string | undefined {
  if (!hostname) {
    return undefined;
  }
  const normalized = hostname.toLowerCase();
  if (IPV4_PATTERN.test(normalized)) {
    return undefined;
  }
  const labels = normalized.split('.');
  // Fewer than 3 labels means there's no subdomain to read as a tenant
  // slug (`localhost` → 1, `antrique.app` → 2, both apex/base domains,
  // not a tenant-specific hostname).
  if (labels.length < 3) {
    return undefined;
  }
  return labels[0];
}

// Same reasoning as http-logging.middleware.ts's identical helper —
// Express header values can be string | string[] | undefined, and a
// blank value counts as absent, not "present but empty".
function firstHeader(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first !== undefined && first.trim().length > 0 ? first.trim() : undefined;
}
