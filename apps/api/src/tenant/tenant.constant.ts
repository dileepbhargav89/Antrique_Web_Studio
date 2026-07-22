// The one HTTP convention TenantResolver needs to know about — a named
// constant, not an inlined magic string, matching
// common/guards/jwt-auth.constant.ts's existing precedent for the same
// reason (used by both the resolver and its spec).
export const TENANT_ID_HEADER = 'x-tenant-id';
