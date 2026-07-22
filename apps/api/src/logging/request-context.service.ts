import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import { RequestContext } from './types/request-context.type';

// Wraps Node's AsyncLocalStorage — no DI token, injected by class
// reference (`constructor(private readonly requestContext:
// RequestContextService)`). Unlike LOGGER/LOG_FORMATTER/LOG_TRANSPORT,
// there's no interface to swap this behind and no anticipated second
// implementation; it's a plain provider wrapping a single Node built-in,
// same as any other NestJS service with no competing implementation.
//
// No `.clear()`/`.exit()` method: AsyncLocalStorage's own scoping already
// gives "created, retrieved, cleared" — getContext() is undefined both
// before any run() and after run()'s callback (and everything it
// transitively started) completes. That's the natural resting state, not
// a separate operation to build.
//
// Nothing in this phase calls run() from a real request — that's a future
// middleware's job (apps/api/src/common/middleware/, still a placeholder).
// This phase only proves the mechanism (see request-context.service.spec.ts
// and logger.service.spec.ts's context-merging cases).
//
// Deliberately a default-scoped (singleton) provider, NOT `{ scope:
// Scope.REQUEST }`. One shared AsyncLocalStorage instance is correct —
// isolation between concurrent requests comes from AsyncLocalStorage's
// own per-async-call-graph store tracking, not from the provider's DI
// scope. Making this request-scoped would add per-request instantiation
// overhead for no isolation benefit, and would be a straightforward
// regression to "fix" by a future maintainer unfamiliar with
// AsyncLocalStorage — don't.
@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }
}
