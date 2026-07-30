// Response DTO for POST /auth/logout. Phase 10, Module 4 (Authentication
// & Session Security) replaces the earlier `{ status: 'not_implemented' }`
// placeholder — logout now really revokes the matching Session row (see
// auth.service.ts's logout()) — with a plain success acknowledgement.
// Kept as an empty object, not a boolean/string status field: nothing
// about the outcome is meaningful to the caller beyond "the request was
// accepted" (logout is deliberately idempotent — see logout()'s own
// comments — so there's no distinct "was already logged out" case to
// report).
export class LogoutResponseDto {}
