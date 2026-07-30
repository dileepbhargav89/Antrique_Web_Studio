import { authService } from '@/services/auth/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { apiConfig } from './config';
import { ApiError, type ApiErrorBody } from './http-error';
import { runRequestInterceptors, runResponseInterceptors } from './interceptors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Every hand-authored `features/<module>/api` list-params interface (e.g. `OrderListParams`)
 * is a plain named interface, not an indexed type — assigning one directly to a
 * `Record<string, ...>`-typed property fails TypeScript's assignability check (it requires
 * an explicit index signature), even though every property's value type is compatible.
 */
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/**
 * `Q` is deliberately UNCONSTRAINED (no `extends QueryParams`) — a constraint would still
 * require checking "does this named params interface satisfy `Record<string, ...>`", which
 * fails for the exact same missing-index-signature reason a direct assignment would.
 * Every `apiClient.get<T, Q>(...)` call site now passes its real params interface as the
 * explicit second type argument (TypeScript does not infer trailing type parameters once
 * any earlier one — here, `T` — is given explicitly, so this can't be inferred from the
 * `query` argument alone). With no constraint to satisfy, `query?: Q` accepts that concrete
 * interface directly — trivial self-assignability, not a structural Record check. The one
 * place this DOES need to become a real `QueryParams` again is deep in `request()` below,
 * where it's erased with a single explicit cast before reaching the actually-generic-free
 * internal fetch plumbing (`performRequest`/`performFetch`/`buildUrl`), which only ever
 * needs to iterate `query` as a plain key/value bag, never caring about the caller's exact
 * params shape.
 */
export interface RequestOptions<Q = QueryParams> {
  method?: HttpMethod;
  /** Appended as `?key=value` pairs; `undefined`/`null` values are skipped. */
  query?: Q;
  body?: unknown;
  headers?: HeadersInit;
  /** Pass a TanStack Query `queryFn`'s own `signal` straight through for automatic
   * cancellation on unmount/refetch/query-key change — this is already fully wired,
   * nothing else to configure. */
  signal?: AbortSignal;
}

/** Deliberately NOT `Omit<RequestOptions<Q>, 'method' | 'body'>` — a plain, non-mapped
 * interface keeps the shape simple; see `RequestOptions`'s own comment for why `Q` is
 * unconstrained. */
export interface GetOptions<Q = QueryParams> {
  query?: Q;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

/** GET-only, idempotent — never applied to mutating methods or 4xx responses. */
const RETRY_DELAYS_MS = [300, 900];

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), `${apiConfig.baseUrl.replace(/\/$/, '')}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function performFetch(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', query, body, headers, signal } = options;

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiConfig.timeoutMs);
  signal?.addEventListener('abort', () => controller.abort());

  try {
    const init = await runRequestInterceptors({
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const rawResponse = await fetch(buildUrl(path, query), init);
    return runResponseInterceptors(rawResponse);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * `authService.refresh()` already dedupes concurrent calls at the shared network boundary
 * (`services/auth/auth.service.ts`) — several queries 401ing at once (e.g. a page that
 * fires 3 requests in parallel right as the access token expires) share one real
 * `POST /api/auth/refresh` round trip. This just applies the result to
 * `store/auth-store.ts` so every other consumer (the request interceptor, `AuthProvider`'s
 * redirect effect) sees the new state immediately.
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshed = await authService.refresh();
    useAuthStore.getState().setAuthenticated({
      email: refreshed.email,
      accessToken: refreshed.accessToken,
      expiresAt: refreshed.expiresAt,
    });
    return true;
  } catch {
    useAuthStore.getState().setUnauthenticated();
    return false;
  }
}

/**
 * Generic typed request helper. Response typing is via an explicit `T`
 * type argument, not inferred from the generated OpenAPI schema — every
 * response DTO in the backend currently serializes with zero field-level
 * schema detail (constructor-parameter-properties the Swagger CLI plugin
 * can't introspect; a known, documented backend limitation, not something
 * to work around here). Request bodies, by contrast, CAN reuse generated
 * `paths[...]['requestBody']` types, since request DTOs are fully typed.
 *
 * Retry policy: network failures and 5xx responses retry twice with a fixed
 * backoff (300ms/900ms) — GET only, since retrying a mutation risks a
 * duplicate side effect. A 401 (and only the first one per call) triggers a
 * single silent refresh-and-retry via `refreshAccessToken()` before falling
 * through to the normal error path.
 */
export async function request<T, Q = QueryParams>(
  path: string,
  options: RequestOptions<Q> = {},
): Promise<T> {
  // `Q` is erased here — see `RequestOptions`'s own comment. Everything below this line
  // (`performRequest`/`performFetch`/`buildUrl`) only ever treats `query` as a plain
  // key/value bag for building a querystring, never as the caller's specific params shape.
  // Double-cast: `RequestOptions<Q>` and `RequestOptions` (Q defaulted) have no guaranteed
  // structural overlap for an arbitrary `Q`, so a direct `as RequestOptions` isn't safe to
  // assume compiles — going through `unknown` is the correct, deliberate type-erasure step,
  // not a shortcut.
  return performRequest<T>(path, options as unknown as RequestOptions, false);
}

async function performRequest<T>(
  path: string,
  options: RequestOptions,
  isRetryAfterRefresh: boolean,
): Promise<T> {
  const method = options.method ?? 'GET';
  let attempt = 0;

  for (;;) {
    let response: Response;
    try {
      response = await performFetch(path, options);
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (method === 'GET' && delay !== undefined) {
        await sleep(delay);
        attempt += 1;
        continue;
      }
      throw error;
    }

    if (response.ok) {
      if (response.status === 204) {
        return undefined as T;
      }
      return (await response.json()) as T;
    }

    if (response.status === 401 && !isRetryAfterRefresh && typeof window !== 'undefined') {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return performRequest<T>(path, options, true);
      }
    }

    const delay = RETRY_DELAYS_MS[attempt];
    if (method === 'GET' && response.status >= 500 && delay !== undefined) {
      await sleep(delay);
      attempt += 1;
      continue;
    }

    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody ?? { statusCode: response.status, message: response.statusText },
    );
  }
}
