export interface SessionResult {
  authenticated: boolean;
  accessToken?: string;
  email?: string;
  expiresAt?: number | null;
}

export interface LoginResult {
  accessToken: string;
  email: string;
  expiresAt: number | null;
}

interface ErrorBody {
  statusCode?: number;
  message?: string | string[];
}

/** Carries the real HTTP status of a failed BFF/backend call — plain `Error` doesn't,
 * which meant callers (the login form) couldn't distinguish a 401 (bad credentials) from
 * a 400 (validation) or 500 (server error) to show the right copy for each. */
export class AuthRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthRequestError';
    this.status = status;
  }
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T & ErrorBody) | null;
  if (!response.ok) {
    const message =
      body && 'message' in body
        ? Array.isArray(body.message)
          ? body.message.join(' ')
          : body.message
        : response.statusText;
    throw new AuthRequestError(response.status, message ?? 'Request failed');
  }
  return body as T;
}

function refreshRequest(): Promise<LoginResult> {
  return fetch('/api/auth/refresh', { method: 'POST' }).then((response) =>
    parseOrThrow<LoginResult>(response),
  );
}

let refreshPromise: Promise<LoginResult> | null = null;

/**
 * Dedupes concurrent refresh attempts at the one shared network boundary both real
 * call sites go through: `services/api/request.ts`'s 401-retry path and
 * `providers/auth-provider.tsx`'s proactive pre-expiry timer. Without this, the two could
 * independently fire their own `POST /api/auth/refresh` if they landed close together —
 * each still succeeds (the backend's refresh is stateless/non-rotating), so nothing broke,
 * but it's an avoidable duplicate request. Every caller now shares one in-flight promise.
 */
function refreshDeduped(): Promise<LoginResult> {
  if (!refreshPromise) {
    refreshPromise = refreshRequest().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Thin client for this app's own BFF routes (`app/api/auth/*`, same-origin `fetch` —
 * never `services/api/apiClient`, which talks to the real backend directly and doesn't
 * know this session cookie exists). `login()` is the one real, fully-wired auth action a
 * form calls (`app/(auth)/login/login-form.tsx`) — no signup/forgot-password, the real
 * backend has no such endpoints.
 */
export const authService = {
  login(email: string, password: string): Promise<LoginResult> {
    return fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then((response) => parseOrThrow<LoginResult>(response));
  },

  fetchSession(): Promise<SessionResult> {
    return fetch('/api/auth/session', { cache: 'no-store' }).then((response) =>
      parseOrThrow<SessionResult>(response),
    );
  },

  refresh: refreshDeduped,

  logout(): Promise<{ ok: boolean }> {
    return fetch('/api/auth/logout', { method: 'POST' }).then((response) =>
      parseOrThrow<{ ok: boolean }>(response),
    );
  },
};
