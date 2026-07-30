import { resolveTenantId, TENANT_ID_HEADER } from '@/lib/auth/tenant';
import { useAuthStore } from '@/store/auth-store';

/**
 * Architecture seam for direct browser → `apps/api` calls: transforms the outgoing
 * `RequestInit` / incoming `Response` before `request.ts` acts on either. This phase wires
 * the one interceptor it actually needs — Bearer + tenant header attachment; the 401
 * refresh-and-retry itself lives in `request.ts` (a full request retry, not a response
 * transform, so it doesn't fit this pipeline's shape).
 */
export type RequestInterceptor = (init: RequestInit) => RequestInit | Promise<RequestInit>;
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

/**
 * Only ever meaningful in the browser: `useAuthStore`'s in-memory access token is a
 * per-tab concept, and this same client code also runs during any Server Component render
 * — reading a module-level store there would leak one request's token into a shared Node
 * process across unrelated requests. Authenticated Server Component data-fetching needs
 * its own path via `lib/auth/session-cookie.ts`, not this interceptor.
 */
function attachAuthHeaders(init: RequestInit): RequestInit {
  if (typeof window === 'undefined') return init;

  const headers = new Headers(init.headers);

  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const tenantId = resolveTenantId();
  if (tenantId) {
    headers.set(TENANT_ID_HEADER, tenantId);
  }

  return { ...init, headers };
}

export const requestInterceptors: RequestInterceptor[] = [attachAuthHeaders];
export const responseInterceptors: ResponseInterceptor[] = [];

export async function runRequestInterceptors(init: RequestInit): Promise<RequestInit> {
  let current = init;
  for (const interceptor of requestInterceptors) {
    current = await interceptor(current);
  }
  return current;
}

export async function runResponseInterceptors(response: Response): Promise<Response> {
  let current = response;
  for (const interceptor of responseInterceptors) {
    current = await interceptor(current);
  }
  return current;
}
