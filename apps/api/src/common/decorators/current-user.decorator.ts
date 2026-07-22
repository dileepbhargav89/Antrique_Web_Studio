import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { RequestUser } from '../../types/request-user.type';

// The raw extraction logic, exported separately from the
// createParamDecorator()-wrapped version below: Nest's param-decorator
// factories are invoked by its own reflection/metadata machinery, not
// callable directly the way a plain function is, so this is what
// current-user.decorator.spec.ts actually unit-tests — @CurrentUser()
// itself is proven end-to-end through a real controller instead (see
// modules/example-domain/example-domain.controller.spec.ts and the live
// `GET /example/ping` boot test).
export function extractCurrentUser(context: ExecutionContext): RequestUser | undefined {
  const request = context.switchToHttp().getRequest<Request>();
  return request.user;
}

// Milestone 2 (Authorization Foundation) — reads the `RequestUser`
// JwtAuthGuard already attached to `request.user`; this decorator has no
// verification logic of its own; it can only return a real, authenticated
// user on a route also guarded by JwtAuthGuard (undefined otherwise,
// since nothing else in this codebase sets `request.user`).
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser | undefined => extractCurrentUser(ctx),
);
