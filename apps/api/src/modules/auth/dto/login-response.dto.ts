import { TokenResponseDto } from './token-response.dto';

// Response DTO for POST /auth/login. Phase 1.2D.8 replaces the Phase
// 1.2D.4 `{ status: 'not_implemented' }` placeholder with a real
// access+refresh token pair — see auth.service.ts's login() for what
// "real" means here: token issuance is real (TokenService), but
// credential verification against a persisted hash is not, since
// persistence doesn't exist yet.
export class LoginResponseDto extends TokenResponseDto {}
