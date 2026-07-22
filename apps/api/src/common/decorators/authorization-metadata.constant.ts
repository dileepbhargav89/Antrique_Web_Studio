// Reflector metadata keys shared between the decorators that set them
// (roles.decorator.ts/permissions.decorator.ts, via `SetMetadata()`) and
// the guards that read them (common/guards/roles.guard.ts/
// permissions.guard.ts, via `Reflector.getAllAndOverride()`) — kept as
// named constants, not inlined magic strings, matching
// jwt-auth.constant.ts's existing convention for this same reason.
export const ROLES_KEY = 'roles';
export const PERMISSIONS_KEY = 'permissions';
