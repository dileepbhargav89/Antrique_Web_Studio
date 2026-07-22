import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './authorization-metadata.constant';

// Metadata only — no authorization logic here (this milestone's own
// requirement). `SetMetadata()` just attaches `roles` to the route
// handler's/controller's reflection metadata; `RolesGuard`
// (common/guards/roles.guard.ts) is what actually reads it via
// `Reflector` and decides anything. A route with `@Roles('admin',
// 'super_admin')` grants access to a caller holding *any* one of the
// listed role keys (OR semantics — the conventional reading for
// role checks: a user typically holds one primary role, and multiple
// listed roles means "any of these is enough"), not all of them.
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
