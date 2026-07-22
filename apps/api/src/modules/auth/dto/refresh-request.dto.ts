import { IsString, MinLength } from 'class-validator';

// Request DTO for POST /auth/refresh. Enforced at the HTTP boundary by
// the global ValidationPipe (Phase 1.2D.5, main.ts) — see
// login-request.dto.ts's header comment.
export class RefreshRequestDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
