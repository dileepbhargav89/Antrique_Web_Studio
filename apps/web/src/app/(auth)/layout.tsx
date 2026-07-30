import Link from 'next/link';
import { redirect } from 'next/navigation';
import { appConfig } from '@/config/app';
import { ROUTES } from '@/config/routes';
import { isTokenExpired } from '@/lib/auth/jwt';
import { readSessionCookie } from '@/lib/auth/session-cookie';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await readSessionCookie();
  if (session && !isTokenExpired(session.refreshToken)) {
    redirect(ROUTES.portal.dashboard);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-4">
      <Link href={ROUTES.marketing.home} className="font-heading text-lg font-semibold">
        {appConfig.name}
      </Link>
      <main id="main-content" className="w-full max-w-sm">
        {children}
      </main>
    </div>
  );
}
