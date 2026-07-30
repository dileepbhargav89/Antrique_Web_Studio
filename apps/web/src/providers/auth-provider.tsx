'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authService } from '@/services/auth/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { ROUTES } from '@/config/routes';

const REFRESH_MARGIN_MS = 60_000;
const PORTAL_PATHS = Object.values(ROUTES.portal);

function isPortalPath(pathname: string): boolean {
  return PORTAL_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Mounted once inside `AppProviders`, above every route. The access token lives in
 * memory only (`store/auth-store.ts`), so a hard refresh always restarts from
 * `status: 'loading'` — this bootstraps it from the httpOnly session cookie via
 * `GET /api/auth/session`, schedules a proactive refresh ahead of expiry, and redirects to
 * `/login?reason=expired` if a portal-path visit ever ends up unauthenticated mid-session
 * (a failed silent refresh) — `middleware.ts`'s own redirect only fires on navigation, not
 * on a client-side status change after the page has already loaded.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const refreshTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let cancelled = false;

    authService
      .fetchSession()
      .then((session) => {
        if (cancelled) return;
        if (session.authenticated && session.accessToken && session.email) {
          setAuthenticated({
            email: session.email,
            accessToken: session.accessToken,
            expiresAt: session.expiresAt ?? null,
          });
        } else {
          setUnauthenticated();
        }
      })
      .catch(() => {
        if (!cancelled) setUnauthenticated();
      });

    return () => {
      cancelled = true;
    };
    // Runs once on mount only — re-authenticating on every pathname change would defeat
    // the point of caching session status in the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !expiresAt) return undefined;

    const delay = Math.max(expiresAt - Date.now() - REFRESH_MARGIN_MS, 0);
    refreshTimeout.current = setTimeout(() => {
      authService
        .refresh()
        .then((refreshed) =>
          setAuthenticated({
            email: refreshed.email,
            accessToken: refreshed.accessToken,
            expiresAt: refreshed.expiresAt,
          }),
        )
        .catch(() => setUnauthenticated());
    }, delay);

    return () => clearTimeout(refreshTimeout.current);
  }, [status, expiresAt, setAuthenticated, setUnauthenticated]);

  useEffect(() => {
    // Reaching this with `status === 'unauthenticated'` while already on a portal path is,
    // by construction, always the mid-session case (a fresh unauthenticated visit never
    // gets this far — `middleware.ts` redirects it before the page renders) — so `reason=
    // expired` is accurate here, unlike a first-visit redirect.
    if (status === 'unauthenticated' && isPortalPath(pathname)) {
      router.push(`${ROUTES.auth.login}?redirect=${encodeURIComponent(pathname)}&reason=expired`);
    }
  }, [status, pathname, router]);

  return <>{children}</>;
}
