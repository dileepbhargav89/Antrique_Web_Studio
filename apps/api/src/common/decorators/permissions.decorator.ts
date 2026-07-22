import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from './authorization-metadata.constant';

// Metadata only — no authorization logic here, the same discipline
// roles.decorator.ts follows. `PermissionsGuard`
// (common/guards/permissions.guard.ts) reads this via `Reflector`. A
// route with `@Permissions('projects:write', 'projects:read')` requires
// *all* listed permission keys (AND semantics — permissions are
// additive requirements for a single action, unlike the OR semantics
// `@Roles()` uses), not just one.
export const Permissions = (...permissions: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
