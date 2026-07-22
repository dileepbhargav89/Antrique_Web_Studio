import { IsEmail, IsString, MinLength } from 'class-validator';

// Request DTO for POST /auth/login. Validation rules are deliberately
// minimal — real password complexity/format rules would be business
// logic this phase explicitly excludes (no hashing, no real credential
// check yet — see auth.service.ts). Enforced at the HTTP boundary by
// the global ValidationPipe (Phase 1.2D.5, main.ts) — also verified
// directly via class-validator's own validate() in
// login-request.dto.spec.ts, independent of the HTTP layer.
export class LoginRequestDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
