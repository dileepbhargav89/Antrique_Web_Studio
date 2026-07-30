'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { InfoIcon } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Spinner } from '@/components/ui/spinner';
import { Fade } from '@/components/motion/fade';
import { ROUTES } from '@/config/routes';
import { AuthRequestError, authService } from '@/services/auth/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { loginFormSchema, type LoginFormValues } from '@/lib/validation/auth';

type SubmitStatus = 'idle' | 'submitting' | 'error';

/**
 * Resolves `?redirect=` against a fixed base and requires the result to stay on the same
 * origin — using the real URL parser rather than a hand-rolled string prefix check
 * (`startsWith('//')` alone) matters here: the WHATWG URL spec normalizes a leading
 * backslash the same as a forward slash for special schemes (a legacy IE-compat rule), so
 * `/\evil.com` or `/\/evil.com` resolve to an external origin exactly like `//evil.com`
 * does, and a naive prefix check misses that whole bypass class. Also requires a leading
 * `/`, matching how `middleware.ts` always constructs this param — same-origin but
 * scheme-relative-without-a-slash values aren't a shape this app ever produces.
 */
function safeRedirectPath(path: string | null): string {
  if (path?.startsWith('/')) {
    try {
      const resolved = new URL(path, 'http://localhost');
      if (resolved.origin === 'http://localhost') {
        return path;
      }
    } catch {
      // Malformed — fall through to the safe default below.
    }
  }
  return ROUTES.portal.dashboard;
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof AuthRequestError) {
    if (error.status === 401) {
      return 'The email or password you entered is incorrect.';
    }
    if (error.status === 400) {
      return error.message;
    }
  }
  return 'Something went wrong signing you in. Please try again.';
}

/**
 * Submits directly to `authService.login()` (the BFF `/api/auth/login` route) — no new
 * API contract, this is the same seam `services/auth/auth.service.ts` reserved since
 * Phase 1. No "remember me": the backend issues the same token pair unconditionally, so
 * there's no persistent-vs-session-only choice for a checkbox to actually control.
 */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  const expired = searchParams.get('reason') === 'expired';
  const destination = safeRedirectPath(searchParams.get('redirect'));

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    setStatus('submitting');
    setFormError(null);
    try {
      const session = await authService.login(values.email, values.password);
      setAuthenticated({
        email: session.email,
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
      });
      router.push(destination);
    } catch (error) {
      setStatus('error');
      setFormError(loginErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {expired ? (
        <Fade>
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertTitle>Your session has expired</AlertTitle>
            <AlertDescription>Please log in again to continue.</AlertDescription>
          </Alert>
        </Fade>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the one field a login page should focus on load */}
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {formError ? (
            <Fade>
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            </Fade>
          ) : null}

          <Button type="submit" disabled={status === 'submitting'} className="gap-2">
            {status === 'submitting' ? <Spinner size="sm" /> : null}
            Log In
          </Button>
        </form>
      </Form>
    </div>
  );
}

export { LoginForm };
