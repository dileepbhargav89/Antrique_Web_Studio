// Milestone 4 (Organization & Multi-Tenant Foundation) — the resolved
// tenant identity `tenant/middleware/tenant.middleware.ts` attaches to
// `request.tenantContext` for EVERY request (not just authenticated
// ones — even `POST /auth/login` needs a tenant to scope its user
// lookup against), and `common/decorators/tenant.decorator.ts` reads
// back out. Deliberately minimal — the bare id needed to tenant-scope a
// query — mirroring `RequestUser`'s own "just enough to identify, no
// extra fields" philosophy (`request-user.type.ts`). The richer,
// display-oriented tenant details live in the separate
// `OrganizationContext` (`organization-context.type.ts`) instead of
// being folded in here, the same reasoning `RequestUser`/
// `AuthTokenPayload` stayed two separate declarations for
// (`docs/implementation/decisions.md`, Milestone 2 entry) — this one
// exists to be threaded into every tenant-scoped repository call
// cheaply; that one exists to be displayed.
export interface TenantContext {
  readonly tenantId: string;
}

declare global {
  // Required by Express's own augmentation pattern; there is no
  // non-namespace way to extend a third-party ambient global interface —
  // same reasoning as request-user.type.ts's identical declaration.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}
