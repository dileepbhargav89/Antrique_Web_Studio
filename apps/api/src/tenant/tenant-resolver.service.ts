import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Request } from 'express';
import { OrganizationRepository } from './repositories/organization.repository';
import appConfig from '../config/app/app.config';
import defaultTenantConfig from './config/default-tenant.config';
import { TENANT_ID_HEADER } from './tenant.constant';
import { CacheService } from '../cache/cache.service';

// Phase 10, Module 8 (Caching) — this codebase's hottest uncached read
// path (confirmed by audit): every single request, authenticated or
// not, resolves a tenant before anything else runs. 60s — the same
// order of magnitude `AuthorizationService`'s own role-resolution cache
// already uses (`ROLE_CACHE_TTL_MS`) — balances real query reduction on
// the hottest path in this API against how stale an org's active-flag/
// name/slug is allowed to be after a rare admin change (deactivating a
// tenant, renaming it). Not a correctness risk the way caching
// transactional/business state would be — see `CacheService`'s own
// "what to cache / what never to cache" rule.
//
// `getOrLoad()` caches whatever the repository call returns, including
// `null` ("no active tenant matches this candidate") — a deliberate
// choice, not an oversight: a `null` result for the hostname/header
// path already falls through to the next resolution priority
// regardless of whether it came from cache or a fresh query, so the
// per-request OUTCOME is unaffected; caching it too means a bogus/
// probing candidate (a made-up subdomain, a guessed tenant-id header)
// doesn't re-query the database on every single attempt within the
// window. The one real trade-off: a brand-new tenant is invisible via
// its own hostname for up to 60s immediately after creation (a rare,
// admin-timed operation, not something a user is watching happen in
// real time — and the `X-Tenant-ID` header path, keyed independently,
// isn't affected).
const TENANT_RESOLVE_CACHE_TTL_MS = 60_000;

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
    private readonly cache: CacheService,
  ) {}

  async resolve(request: Request): Promise<ResolvedTenant> {
    const hostnameCandidate = extractHostnameSlugCandidate(request.hostname);
    if (hostnameCandidate) {
      const tenant = await this.cache.getOrLoad(
        `tenant-resolve:slug:${hostnameCandidate}`,
        TENANT_RESOLVE_CACHE_TTL_MS,
        () => this.organizationRepository.findActiveBySlug(hostnameCandidate),
      );
      if (tenant) {
        return { id: tenant.id, name: tenant.name, slug: tenant.slug, source: 'hostname' };
      }
    }

    const headerTenantId = firstHeader(request.headers[TENANT_ID_HEADER]);
    if (headerTenantId) {
      const tenant = await this.cache.getOrLoad(
        `tenant-resolve:id:${headerTenantId}`,
        TENANT_RESOLVE_CACHE_TTL_MS,
        () => this.organizationRepository.findActiveById(headerTenantId),
      );
      if (tenant) {
        return { id: tenant.id, name: tenant.name, slug: tenant.slug, source: 'header' };
      }
    }

    if (this.app.nodeEnv === 'development') {
      const tenant = await this.cache.getOrLoad(
        `tenant-resolve:id:${this.defaultTenant.id}`,
        TENANT_RESOLVE_CACHE_TTL_MS,
        () => this.organizationRepository.findActiveById(this.defaultTenant.id),
      );
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
