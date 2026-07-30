import { NextFunction, Request, Response } from 'express';
import { TenantMiddleware } from './tenant.middleware';
import { TenantResolver } from '../tenant-resolver.service';
import { TenantRlsContextService } from '../../database/tenant-rls-context.service';

const RESOLVED = {
  id: '00000000-0000-7000-8000-000000000001',
  name: 'Antrique Web Studio',
  slug: 'antrique',
  source: 'default' as const,
};

function createFakeResolver(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    resolve: jest.fn(async () => RESOLVED),
    ...overrides,
  } as unknown as TenantResolver;
}

describe('TenantMiddleware', () => {
  it('attaches a frozen tenantContext and organizationContext derived from one resolve() call, then calls next()', async () => {
    const resolver = createFakeResolver();
    const tenantRlsContext = new TenantRlsContextService();
    const middleware = new TenantMiddleware(resolver, tenantRlsContext);
    const req = {} as Request;
    const next = jest.fn() as NextFunction;

    await middleware.use(req, {} as Response, next);

    expect(resolver.resolve).toHaveBeenCalledTimes(1);
    expect(resolver.resolve).toHaveBeenCalledWith(req);
    expect(req.tenantContext).toEqual({ tenantId: RESOLVED.id });
    expect(req.organizationContext).toEqual({
      id: RESOLVED.id,
      name: RESOLVED.name,
      slug: RESOLVED.slug,
    });
    expect(Object.isFrozen(req.tenantContext)).toBe(true);
    expect(Object.isFrozen(req.organizationContext)).toBe(true);
    expect(next).toHaveBeenCalledWith();
  });

  it('seeds TenantRlsContextService with the resolved tenantId before calling next()', async () => {
    const resolver = createFakeResolver();
    const tenantRlsContext = new TenantRlsContextService();
    const middleware = new TenantMiddleware(resolver, tenantRlsContext);
    const req = {} as Request;
    let contextInsideNext: unknown;
    const next = jest.fn(() => {
      contextInsideNext = tenantRlsContext.getContext();
    }) as NextFunction;

    await middleware.use(req, {} as Response, next);

    expect(contextInsideNext).toEqual({ tenantId: RESOLVED.id });
    expect(tenantRlsContext.getContext()).toBeUndefined();
  });

  it('forwards a resolution failure to next(error) instead of throwing or hanging', async () => {
    const error = new Error('Tenant could not be resolved');
    const resolver = createFakeResolver({ resolve: jest.fn(async () => Promise.reject(error)) });
    const tenantRlsContext = new TenantRlsContextService();
    const middleware = new TenantMiddleware(resolver, tenantRlsContext);
    const req = {} as Request;
    const next = jest.fn() as NextFunction;

    await middleware.use(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(req.tenantContext).toBeUndefined();
  });
});
