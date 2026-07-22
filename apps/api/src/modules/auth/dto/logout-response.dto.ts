// Response DTO for POST /auth/logout. No matching LogoutRequestDto
// exists — there's no session/token concept yet to reference in a
// request body (see auth.service.ts), matching
// domain-module-guide.md §3's "a GET with no body/query params has a
// response DTO only" rule, applied here to a POST with nothing
// meaningful to accept yet.
export class LogoutResponseDto {
  readonly status = 'not_implemented' as const;
}
