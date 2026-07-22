// The four role keys Milestone 3 (Role & Permission Foundation) seeds and
// validates against — matching `prisma/seed.ts`'s `Role.key` values
// exactly, not a re-declaration of business rules. Role/Permission lookup
// stays database-driven (this milestone's own requirement): these
// constants exist only so code that references a specific role (e.g. an
// example endpoint's `@Roles()` call, or a test) doesn't repeat the raw
// string, not to stand in for a real roles table.
//
// Real, used values only — `admin`/`sales`/`project_manager`/`client`
// (already seeded, unchanged by this milestone) aren't listed here since
// no code in this milestone references them by constant; add a key only
// when something real needs it, matching this codebase's existing
// "speculative constants forbidden" discipline
// (docs/architecture/domain-module-guide.md).
export const ROLE = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  CUSTOMER: 'customer',
} as const;

export type RoleKey = (typeof ROLE)[keyof typeof ROLE];
