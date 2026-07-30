import { serverEnv } from '@/config/env.server';
import { apiConfig } from '@/services/api/config';
import type { ApiErrorBody } from '@/services/api/http-error';
import { resolveTenantId, TENANT_ID_HEADER } from './tenant';

export class BackendAuthError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorBody;

  constructor(statusCode: number, body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join(' ') : body.message);
    this.name = 'BackendAuthError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

interface BackendCallOptions {
  /** e.g. `/auth/login` — appended after `/api/{version}`. */
  path: string;
  body?: unknown;
}

/**
 * Calls the real backend's Auth routes server-to-server, via `API_INTERNAL_URL` —
 * never `NEXT_PUBLIC_API_BASE_URL`. This only ever runs on the Next.js server (Route
 * Handlers), so it bypasses the browser entirely: no CORS involved (the backend's
 * `credentials: false` CORS config is about browser requests, irrelevant here), and the
 * httpOnly session cookie never needs to leave this server. The one shared seam for
 * `login`/`refresh`/`logout` — see the route handlers under `app/api/auth/`.
 */
export async function callBackendAuth<T>({ path, body }: BackendCallOptions): Promise<T> {
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
    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new BackendAuthError(
      response.status,
      errorBody ?? { statusCode: response.status, message: response.statusText },
    );
  }

  return (await response.json()) as T;
}
