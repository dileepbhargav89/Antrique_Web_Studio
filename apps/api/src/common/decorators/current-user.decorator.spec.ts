import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { extractCurrentUser } from './current-user.decorator';

function createExecutionContext(user?: { email: string }): ExecutionContext {
  const request = { user } as unknown as Request;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('extractCurrentUser', () => {
  it('returns the RequestUser JwtAuthGuard attached to request.user', () => {
    const context = createExecutionContext({ email: 'user@example.com' });

    expect(extractCurrentUser(context)).toEqual({ email: 'user@example.com' });
  });

  it('returns undefined when request.user was never set (no guard ran)', () => {
    const context = createExecutionContext(undefined);

    expect(extractCurrentUser(context)).toBeUndefined();
  });
});
