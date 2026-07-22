import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { extractOrganization } from './organization.decorator';

function createExecutionContext(organizationContext?: {
  id: string;
  name: string;
  slug: string;
}): ExecutionContext {
  const request = { organizationContext } as unknown as Request;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('extractOrganization', () => {
  it('returns the OrganizationContext TenantMiddleware attached to request.organizationContext', () => {
    const organization = { id: 'tenant-1', name: 'Antrique Web Studio', slug: 'antrique' };
    const context = createExecutionContext(organization);

    expect(extractOrganization(context)).toEqual(organization);
  });

  it('returns undefined when request.organizationContext was never set', () => {
    const context = createExecutionContext(undefined);

    expect(extractOrganization(context)).toBeUndefined();
  });
});
