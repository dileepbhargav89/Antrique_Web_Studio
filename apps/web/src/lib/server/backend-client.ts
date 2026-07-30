import { serverEnv } from '@/config/env.server';
import { apiConfig } from '@/services/api/config';
import { resolveTenantId, TENANT_ID_HEADER } from '@/lib/auth/tenant';

interface ErrorBody {
  statusCode?: number;
  message?: string | string[];
}

/** Carries the real HTTP status of a failed backend call — same shape as
 * `services/auth/auth.service.ts`'s own `AuthRequestError`. */
export class BackendServiceError extends Error {
  readonly status: number;
  readonly body: ErrorBody;

  constructor(status: number, body: ErrorBody) {
    const message = body.message
      ? Array.isArray(body.message)
        ? body.message.join(' ')
        : body.message
      : 'Request failed';
    super(message);
    this.name = 'BackendServiceError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Server-to-server POST to the real backend (`API_INTERNAL_URL`, never
 * `NEXT_PUBLIC_API_BASE_URL`) — the same pattern
 * `lib/auth/backend-auth-client.ts`'s `callBackendAuth()` already
 * established for auth, deliberately duplicated here rather than
 * generalizing that file: auth is a proven, already-reviewed code path,
 * and this is a much smaller surface (2 public marketing routes) — not
 * worth the risk of touching it. Only ever called from Route Handlers
 * (`app/api/contact/route.ts`, `app/api/newsletter/route.ts`), never
 * from a Client Component.
 */
export async function callBackendService<T>(path: string, body: unknown): Promise<T> {
  const tenantId = resolveTenantId();

  const response = await fetch(`${serverEnv.API_INTERNAL_URL}/api/${apiConfig.version}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tenantId ? { [TENANT_ID_HEADER]: tenantId } : {}),
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ErrorBody | null;
    throw new BackendServiceError(
      response.status,
      errorBody ?? { statusCode: response.status, message: response.statusText },
    );
  }

  return (await response.json()) as T;
}
