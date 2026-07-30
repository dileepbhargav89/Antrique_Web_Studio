import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantResolver } from '../tenant-resolver.service';
import { TenantContext } from '../../types/tenant-context.type';
import { OrganizationContext } from '../../types/organization-context.type';
import { TenantRlsContextService } from '../../database/tenant-rls-context.service';
import { RequestContextService } from '../../logging';

// The orchestration half of tenant resolution — calls TenantResolver
// (../tenant-resolver.service.ts, pure decision logic) once, then
// attaches BOTH derived views to `request` in one pass: `tenantContext`
// (minimal, for query-scoping — types/tenant-context.type.ts) and
// `organizationContext` (richer, for display — types/
// organization-context.type.ts). One resolution, two attached views —
// this is what "tenant resolution occurs once per request" means in
// practice, not two separate lookups for two separate fields. Both are
// `Object.freeze()`d — genuinely immutable at runtime, not only
// TypeScript-`readonly`-typed, mirroring JwtAuthGuard's identical
// treatment of `request.user`.
//
// Registered via `TenantModule`'s own `NestModule.configure()` +
// `MiddlewareConsumer.forRoutes('*')` — NOT raw `app.use()` in main.ts
// like `HttpLoggingMiddleware` (see that class's own comment for why
// *it* needed the raw-app.use() workaround: consumer-configured
// middleware is scoped to `app.setGlobalPrefix()`'s prefix, which would
// silently skip a future unprefixed route like `/health`). Tenant
// resolution is deliberately different: it's an API-only concern with no
// current or planned unprefixed consumer, and going through
// `MiddlewareConsumer` instead of raw `app.use()` is what makes a thrown
// `BadRequestException` (TenantResolver, when resolution fails) reliably
// reach Nest's own exception-filter pipeline — confirmed live, not
// assumed (see docs/implementation/decisions.md).
//
// Explicit try/catch + `next(error)`, not a bare `await` inside an async
// `use()`: Express 4 (this app's platform) does not automatically catch
// a rejected promise from middleware and forward it to error-handling
// middleware — an unhandled rejection there would hang the request
// instead of producing a clean 400. Forwarding the error to `next()`
// explicitly is what correctly routes it into Nest's exception filter.
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantResolver: TenantResolver,
    private readonly tenantRlsContext: TenantRlsContextService,
    private readonly requestContext: RequestContextService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
      const resolved = await this.tenantResolver.resolve(req);

      const tenantContext: TenantContext = Object.freeze({ tenantId: resolved.id });
      const organizationContext: OrganizationContext = Object.freeze({
        id: resolved.id,
        name: resolved.name,
        slug: resolved.slug,
      });

      req.tenantContext = tenantContext;
      req.organizationContext = organizationContext;

      // Phase 10, Module 5 (Observability) — enriches the ALREADY-running
      // RequestContext (established upstream by HttpLoggingMiddleware,
      // which must run first — see that class's own comment) with
      // `tenantId`, so every log line for the rest of this request
      // carries it, the same way requestId/correlationId already do. A
      // mutation, not a new `run()` — see RequestContextService.
      // updateContext()'s own comment for why.
      this.requestContext.updateContext({ tenantId: resolved.id });

      // Phase 10, Module 3 (Security Hardening) — seeds the RLS session
      // context `PrismaService`'s own `$extends` query hook reads.
      // `run()` wraps `next()` synchronously, same "AsyncLocalStorage
      // propagates to everything downstream" pattern
      // `HttpLoggingMiddleware`/`RequestContextService` already
      // established — see that class's own comment.
      this.tenantRlsContext.run({ tenantId: resolved.id }, () => next());
    } catch (error) {
      next(error);
    }
  }
}
