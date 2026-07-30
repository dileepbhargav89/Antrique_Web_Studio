import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ROUTES } from '@/config/routes';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { LoginForm } from './login-form';

/** `noindex` — `/login` is already reserved in `lib/seo/seo.config.ts`'s
 * `NOINDEX_ROUTES`/`robots.ts`'s disallow list. */
export const metadata: Metadata = buildPageMetadata({
  title: 'Log In',
  description: 'Log in to your Antrique Web Studio client portal.',
  path: ROUTES.auth.login,
  noindex: true,
});

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="font-heading text-2xl font-medium">Log In</h1>
        <p className="text-muted-foreground text-sm">Sign in to access your client portal.</p>
      </div>
      {/* useSearchParams() inside LoginForm requires a Suspense boundary in the App Router. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
