import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { extractTenant } from './tenant.decorator';

function createExecutionContext(tenantContext?: { tenantId: string }): ExecutionContext {
  const request = { tenantContext } as unknown as Request;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('extractTenant', () => {
  it('returns the TenantContext TenantMiddleware attached to request.tenantContext', () => {
    const context = createExecutionContext({ tenantId: '00000000-0000-7000-8000-000000000001' });

    expect(extractTenant(context)).toEqual({ tenantId: '00000000-0000-7000-8000-000000000001' });
  });

  it('returns undefined when request.tenantContext was never set', () => {
    const context = createExecutionContext(undefined);

    expect(extractTenant(context)).toBeUndefined();
  });
});
