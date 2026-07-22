// Shared response shape for any endpoint that issues a JWT pair — only
// POST /auth/login does today (Phase 1.2D.8). A real POST /auth/refresh
// would return this same shape once it reissues tokens (still a
// placeholder — see auth.service.ts's refresh()) — one class, not
// duplicated per endpoint, so the wire shape can't drift between them.
export class TokenResponseDto {
  constructor(
    readonly accessToken: string,
    readonly refreshToken: string,
  ) {}
}
