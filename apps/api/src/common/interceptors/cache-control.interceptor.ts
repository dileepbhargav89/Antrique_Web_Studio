import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { CACHE_CONTROL_MAX_AGE_KEY } from '../decorators/cache-control.decorator';

// Milestone 12 (Performance Engineering) — the first real content in
// this previously-placeholder directory (see this folder's own
// README). Registered globally via APP_INTERCEPTOR (app.module.ts) —
// cheap to run on every request (one Reflector metadata lookup), but
// only ever WRITES a header when a route carries `@CacheControl(...)`
// (common/decorators/cache-control.decorator.ts); every other route is
// completely unaffected, a no-op pass-through. Response compression
// (Milestone 12's own separate `compression` middleware, main.ts) and
// Express's own built-in ETag/conditional-GET support (confirmed live,
// no code needed — see docs/architecture/performance.md) both apply
// regardless of whether this interceptor fires.
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const maxAgeSeconds = this.reflector.getAllAndOverride<number | undefined>(
      CACHE_CONTROL_MAX_AGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (maxAgeSeconds !== undefined) {
      const response = context.switchToHttp().getResponse<Response>();
      // `private` is not caller-configurable — see the decorator's own
      // comment for why every annotated route gets it unconditionally.
      response.setHeader('Cache-Control', `private, max-age=${maxAgeSeconds}`);
    }

    return next.handle();
  }
}
