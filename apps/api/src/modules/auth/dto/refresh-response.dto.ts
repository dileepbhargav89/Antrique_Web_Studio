import { TokenResponseDto } from './token-response.dto';

// Response DTO for POST /auth/refresh. Phase 1.2D.9 replaces the Phase
// 1.2D.4 `{ status: 'not_implemented' }` placeholder with a real,
// freshly-reissued access+refresh token pair — same shape
// `LoginResponseDto` already uses, since both endpoints issue the
// identical kind of token pair (see auth.service.ts's refresh()).
export class RefreshResponseDto extends TokenResponseDto {}
