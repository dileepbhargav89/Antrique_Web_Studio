import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { CacheControlInterceptor } from './cache-control.interceptor';
import { CACHE_CONTROL_MAX_AGE_KEY } from '../decorators/cache-control.decorator';

function createContext(response: { setHeader: jest.Mock }) {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function createNext() {
  return { handle: jest.fn(() => of('result')) };
}

describe('CacheControlInterceptor', () => {
  it('sets Cache-Control: private, max-age=<n> when @CacheControl(n) metadata is present', () => {
    const reflector = { getAllAndOverride: jest.fn(() => 30) } as unknown as Reflector;
    const interceptor = new CacheControlInterceptor(reflector);
    const response = { setHeader: jest.fn() };
    const next = createNext();

    interceptor.intercept(createContext(response), next);

    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, max-age=30');
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      CACHE_CONTROL_MAX_AGE_KEY,
      expect.any(Array),
    );
  });

  it('does not touch the response at all when no @CacheControl metadata is present', () => {
    const reflector = { getAllAndOverride: jest.fn(() => undefined) } as unknown as Reflector;
    const interceptor = new CacheControlInterceptor(reflector);
    const response = { setHeader: jest.fn() };
    const next = createNext();

    interceptor.intercept(createContext(response), next);

    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('always passes the request through to next.handle() regardless of metadata', () => {
    const reflector = { getAllAndOverride: jest.fn(() => 30) } as unknown as Reflector;
    const interceptor = new CacheControlInterceptor(reflector);
    const next = createNext();

    const result = interceptor.intercept(createContext({ setHeader: jest.fn() }), next);

    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(result).toBe(next.handle.mock.results[0]!.value);
  });
});
