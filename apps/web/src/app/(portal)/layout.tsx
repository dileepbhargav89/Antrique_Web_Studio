import { redirect } from 'next/navigation';
import { PortalShell } from '@/components/portal/portal-shell';
import { ROUTES } from '@/config/routes';
import { isTokenExpired } from '@/lib/auth/jwt';
import { readSessionCookie } from '@/lib/auth/session-cookie';

/**
 * Defense-in-depth alongside `middleware.ts` — the same presence/expiry check, run again
 * at the layout level in case a future matcher change ever misses a portal path. Real
 * enforcement is still exclusively the backend's `JwtAuthGuard` on every direct API call
 * (see `docs/architecture/application-runtime.md`).
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await readSessionCookie();
  if (!session || isTokenExpired(session.refreshToken)) {
    redirect(ROUTES.auth.login);
  }

  return <PortalShell>{children}</PortalShell>;
}
