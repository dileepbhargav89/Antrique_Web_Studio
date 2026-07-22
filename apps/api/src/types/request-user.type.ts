// The authenticated identity JwtAuthGuard attaches to `request.user`
// (common/guards/jwt-auth.guard.ts) after verifying an access token, and
// what @CurrentUser() (common/decorators/current-user.decorator.ts) reads
// back out — the shared contract between the two, and what any future
// protected controller in any module types its `@CurrentUser()` parameter
// against. Deliberately minimal (Milestone 2's own brief: "Do not
// introduce roles, permissions, tenant, or profile fields yet") — `email`
// only, `readonly` so the type itself documents the immutability
// JwtAuthGuard also enforces at runtime via `Object.freeze()`.
//
// Deliberately a separate declaration from
// modules/auth/types/auth-token-payload.type.ts's `AuthTokenPayload`,
// even though both are `{ email: string }` today: `AuthTokenPayload`
// describes what login()/refresh() sign into a token (owned by the auth
// domain module); `RequestUser` describes what a guard exposes to a
// controller (owned by the cross-cutting HTTP layer). They happen to
// match today because the token payload IS the minimal identity — that's
// not guaranteed to stay true forever (e.g. a future JWT claim that
// shouldn't leak into `RequestUser`), so importing across that module
// boundary isn't done here.
export interface RequestUser {
  readonly email: string;
}

// Express's own `Request` type has no `user` property — this is the
// standard NestJS/Express module-augmentation pattern (the same one
// `@types/passport`, were it installed, would provide) to make
// `request.user` type-check everywhere without an `as` cast at every
// call site. Optional: unauthenticated requests (or any request that
// never reaches JwtAuthGuard) simply never have it set.
declare global {
  // Required by Express's own augmentation pattern; there is no
  // non-namespace way to extend a third-party ambient global interface.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}
