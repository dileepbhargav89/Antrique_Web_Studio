'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CheckCircle2Icon } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/forms/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { newsletterFormSchema, type NewsletterFormValues } from '@/lib/validation/newsletter';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Submits to `app/api/newsletter/route.ts` — a validated, logged placeholder seam, same
 * pattern as `contact/contact-form.tsx` (see that route's own header comment). Not a real
 * ESP integration yet. Duplicate-submit prevention is client-side only (disabled while
 * submitting, form replaced by a success state after) — there's no backend persistence to
 * check a real duplicate against yet.
 */
function NewsletterForm() {
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const form = useForm<NewsletterFormValues>({
    resolver: zodResolver(newsletterFormSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: NewsletterFormValues) {
    setStatus('submitting');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Request failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <p role="status" className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <CheckCircle2Icon aria-hidden="true" className="text-success size-4 shrink-0" />
        Thanks — you&rsquo;re on the list.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full max-w-sm flex-col gap-1.5 sm:w-auto"
        noValidate
      >
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    aria-label="Email address"
                    className="sm:w-56"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={status === 'submitting'}
            className="shrink-0 gap-2"
          >
            {status === 'submitting' ? <Spinner size="sm" /> : null}
            Notify Me
          </Button>
        </div>
        {status === 'error' ? (
          <p role="alert" className="text-destructive text-xs">
            Something went wrong. Please try again.
          </p>
        ) : null}
      </form>
    </Form>
  );
}

export { NewsletterForm };
