import { clientEnv } from '@/config/env';

/** Matches `TENANT_ID_HEADER` in `apps/api/src/tenant/constants/tenant.constant.ts`
 * (`'x-tenant-id'`) — the header `TenantResolver` reads the tenant's UUID `id` from. */
export const TENANT_ID_HEADER = 'X-Tenant-ID';

/**
 * Resolves the tenant id to attach to every `apps/api` call.
 *
 * The backend also supports resolving a tenant from the request's hostname subdomain, but
 * that path only works when the API itself is reachable at a tenant-specific hostname —
 * not the case here (`NEXT_PUBLIC_API_BASE_URL`/`API_INTERNAL_URL` are single fixed URLs
 * shared by every tenant), and there is no lookup endpoint to map a frontend subdomain to
 * a tenant UUID without introducing a new API contract. Real per-visitor tenant resolution
 * (org switcher, subdomain routing, etc.) is an open product decision — see
 * `docs/implementation/blockers.md` and `docs/architecture/application-runtime.md`'s Risks
 * section. Until that's decided, every deployment of this frontend targets exactly one
 * configured tenant.
 */
export function resolveTenantId(): string | undefined {
  return clientEnv.NEXT_PUBLIC_TENANT_ID;
}
