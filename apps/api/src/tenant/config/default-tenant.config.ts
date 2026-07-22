import { registerAs } from '@nestjs/config';
import { validateEnv } from '../../config/env.validation';

// Assembles the `defaultTenant` namespace from the already-validated
// DEFAULT_TENANT_ID env var (env.validation.ts, Milestone 1). Relocated
// here from `modules/auth/config/` (Milestone 4 — Organization &
// Multi-Tenant Foundation): Milestone 1 introduced this as a stopgap
// `AuthRepository` injected directly to satisfy CLAUDE.md's tenant-
// scoping rule before real resolution existed; Milestone 3 added a
// second direct consumer (`RoleRepository`/`PermissionRepository`) and
// deliberately did NOT relocate the file then, reasoning that two
// consumers sharing one factory via `ConfigModule.forFeature()` was
// normal and relocating for two would be premature churn (see
// `docs/implementation/decisions.md`, Milestone 3 entry). This milestone
// changes that calculus: `AuthRepository`/`RoleRepository`/
// `PermissionRepository` all stop injecting this config directly and
// instead take `tenantId` as a plain method parameter, sourced from the
// request's resolved `TenantContext` — this file's ONLY remaining
// consumer is `TenantResolver` (`../tenant-resolver.service.ts`), which
// uses it exclusively as the **development-only fallback** tenant when
// neither hostname nor `X-Tenant-ID` header resolution succeeds. A
// single, genuine, non-cosmetic owner now exists, which is what makes
// relocating (not just reusing in place again) the right call this time.
//
// Not `apps/api/src/config/auth/` — that placeholder stays reserved for
// managed IdP settings specifically (see its own README).
export default registerAs('defaultTenant', () => {
  const env = validateEnv();
  return {
    id: env.DEFAULT_TENANT_ID,
  };
});
