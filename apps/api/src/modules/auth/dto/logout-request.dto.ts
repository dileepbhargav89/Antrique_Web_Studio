import { IsOptional, IsString, MinLength } from 'class-validator';

// Phase 10, Module 4 (Authentication & Session Security) — request DTO
// for POST /auth/logout, now that logout has something real to do (see
// auth.service.ts's logout()). `refreshToken` is OPTIONAL, not required
// — the API contract is frozen (CLAUDE.md), and the endpoint previously
// accepted no body at all; an existing caller sending an empty body must
// keep working. Without it, logout() has no specific session to revoke
// and returns a generic success (matching "logout is idempotent, never
// leaks whether a token was valid" — same undifferentiated-response
// discipline login()/refresh() already establish).
export class LogoutRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}
