// Response DTO for GET /example/ping. Response DTOs are named
// `<Action>ResponseDto`, live in dto/, and are never the same class as an
// entity — see docs/architecture/domain-module-guide.md "DTO organization
// and request/response separation." This endpoint takes no input, so
// there's no matching PingRequestDto; a future endpoint that takes a
// body/query would add one named `<Action>RequestDto` alongside it here.
//
// `authenticatedAs` (Milestone 2) exists solely to make this route's new
// `JwtAuthGuard`/`@CurrentUser()` protection independently verifiable via
// a live HTTP response, not only via unit tests on the guard/decorator in
// isolation — see example-domain.controller.ts's own comment. Not a
// permanent product field; a real endpoint wouldn't echo the caller's own
// identity back to them.
export class PingResponseDto {
  readonly status = 'ok' as const;

  constructor(readonly authenticatedAs: string) {}
}
