import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestMeta } from '../../types/request-meta.type';

// Same shape as tenant.decorator.ts's extractTenant()/Tenant split — raw
// extraction logic exported standalone, directly unit-testable without
// Nest's param-decorator reflection machinery. Same "normalize a
// possibly-array header to its first value, blank counts as absent"
// treatment `common/middleware/http-logging.middleware.ts`'s
// `firstHeader()` already established for `x-request-id`/
// `x-correlation-id` — not reused directly (that one's a private helper
// in a different, unrelated file), but the same reasoning.
export function extractRequestMeta(context: ExecutionContext): RequestMeta {
  const request = context.switchToHttp().getRequest<Request>();
  const rawUserAgent = request.headers['user-agent'];
  const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent;
  return {
    ...(userAgent && userAgent.trim().length > 0 ? { userAgent } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
  };
}

// Phase 10, Module 4 (Authentication & Session Security) — used by
// `AuthController`'s `login()`/`refresh()` to record where a `Session`
// was issued from (`userAgent`/`ipAddress`, schema.prisma's own
// `Session` model), the same "decorator over raw request access"
// convention this controller's own header comment already establishes
// for `@Tenant()`/`@CurrentUser()`.
export const RequestMetaDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestMeta => extractRequestMeta(ctx),
);
