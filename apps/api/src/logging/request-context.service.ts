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

  // Phase 10, Module 5 (Observability) — lets a middleware/guard running
  // LATER in the same request's chain (TenantMiddleware, JwtAuthGuard —
  // neither of which establishes the context itself, HttpLoggingMiddleware
  // already did) enrich the already-running context once it learns
  // something new (tenantId, userId), instead of every log line missing
  // those fields for the rest of the request. `getStore()` returns a live
  // reference to the same object every reader downstream also holds, so
  // mutating it in place (not swapping in a new object) is what makes the
  // update visible without a second `run()` — a second `run()` would
  // start a NEW nested scope, restored back to the outer one the moment
  // its own callback returns, which is the wrong shape for "the rest of
  // THIS request should see this from now on." A no-op outside any
  // run() — nothing to enrich, and no future middleware ever runs one
  // without a context already established upstream (see
  // HttpLoggingMiddleware's own comment on why it must run first).
  updateContext(patch: Partial<RequestContext>): void {
    const context = this.storage.getStore();
    if (context === undefined) {
      return;
    }
    Object.assign(context, patch);
  }
}
