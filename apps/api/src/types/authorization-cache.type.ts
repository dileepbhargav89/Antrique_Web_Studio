// Milestone 3 (Role & Permission Foundation) — "cache permission
// resolution within a request only, no Redis or external cache."
// `AuthorizationService` (apps/api/src/authorization/authorization.service.ts)
// is a singleton, so it cannot hold this cache as its own instance state —
// a plain field there would leak one caller's roles/permissions into a
// concurrent, unrelated request. Instead the cache lives on the `request`
// object itself, the same place `RequestUser` already lives
// (request-user.type.ts): genuinely fresh per HTTP request, populated
// lazily by whichever guard (RolesGuard/PermissionsGuard,
// common/guards/) runs first on a given request, and read/extended by
// whichever runs second — so a route guarded by both never resolves the
// user's roles twice.
//
// Keyed by role, not by user: this app has no per-request user id handy
// (`RequestUser` is deliberately `{ email }` only — see
// request-user.type.ts) and doesn't need one here, since the cache never
// outlives the single request it belongs to.
export interface AuthorizationCache {
  roles?: readonly { readonly id: string; readonly key: string }[];
  permissionKeys?: readonly string[];
}

declare global {
  // Required by Express's own augmentation pattern; there is no
  // non-namespace way to extend a third-party ambient global interface —
  // same reasoning as request-user.type.ts's identical declaration.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      authorizationCache?: AuthorizationCache;
    }
  }
}
