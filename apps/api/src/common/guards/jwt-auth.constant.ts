// The one HTTP convention JwtAuthGuard needs to know about — kept as
// named constants (not inlined magic strings) matching this codebase's
// existing constants.ts convention (e.g.
// modules/auth/constants/auth.constant.ts), even though this is a
// cross-cutting common/ constant, not a domain module's own.
export const AUTHORIZATION_HEADER = 'authorization';
export const BEARER_PREFIX = 'Bearer ';
