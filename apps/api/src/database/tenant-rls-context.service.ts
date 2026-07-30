import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

// Phase 10, Module 3 (Security Hardening) — closes the RLS gap flagged
// in Module 1 / docs/implementation/blockers.md: `database-schema.md`'s
// own documented contract requires `SET LOCAL app.current_tenant_id`
// (and `app.is_platform_admin`/`app.is_service_context`, not wired here
// — see this file's own note below) issued per request, inside the same
// transaction as every query. `PrismaService` (this module) reads this
// store from its own `$extends` query hook; `TenantMiddleware`
// (`tenant/middleware/tenant.middleware.ts`) is the one writer, calling
// `run()` with the already-resolved `tenantId` before `next()` — the
// exact same "run() wraps next() synchronously" pattern
// `logging/request-context.service.ts` established first. A second,
// narrower AsyncLocalStorage instance rather than adding a field to that
// one: `RequestContextService` is owned by the logging module for
// observability metadata; this is security-relevant session state
// consumed by the database layer — different concerns, different owners
// (`logging` doesn't import `database`, and shouldn't need to).
//
// Only `tenantId` today — `isPlatformAdmin`/`isServiceContext` are real,
// active RLS policies (see the RLS migration), but nothing in this
// codebase currently performs an authorized cross-tenant admin action or
// a background service-maintenance job that would need to set them (no
// live cross-tenant admin endpoint exists; `apps/api/src/jobs/` has no
// concrete scheduled job touching the DB yet — confirmed while
// researching this fix). Building unused wiring for a caller that
// doesn't exist yet would be speculative, not necessary — extend
// `TenantRlsContext`/this store's `run()` call the moment a real one
// does (a future job would call `run({ tenantId, isServiceContext: true
// }, ...)` before touching the DB, seeding its own context the way
// `TenantMiddleware` seeds a request's).
@Injectable()
export class TenantRlsContextService {
  private readonly storage = new AsyncLocalStorage<TenantRlsContext>();

  run<T>(context: TenantRlsContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): TenantRlsContext | undefined {
    return this.storage.getStore();
  }
}

export interface TenantRlsContext {
  readonly tenantId: string;
}
