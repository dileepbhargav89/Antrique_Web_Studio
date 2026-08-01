'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CheckCircle2Icon } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { contactFormSchema, type ContactFormValues } from '@/lib/validation/contact';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Submits to `app/api/contact/route.ts`, which proxies to the real backend's
 * `POST /contact-requests` — persists a ContactRequest and fires a confirmation email.
 */
function ContactForm() {
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: '', email: '', phone: '', company: '', message: '' },
  });

  async function onSubmit(values: ContactFormValues) {
    setStatus('submitting');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error('Request failed');
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center"
      >
        <CheckCircle2Icon aria-hidden="true" className="text-success size-10" />
        <p className="font-heading text-lg font-medium">Thanks for reaching out</p>
        <p className="text-muted-foreground text-sm">
          We&rsquo;ll get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile Number (optional)</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+1 555 123 4567" autoComplete="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Your company" autoComplete="organization" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea rows={5} placeholder="Tell us what you're building…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {status === 'error' ? (
          <p role="alert" className="text-destructive text-sm">
            Something went wrong sending your message. Please try again.
          </p>
        ) : null}
        <Button type="submit" disabled={status === 'submitting'} className="gap-2">
          {status === 'submitting' ? <Spinner size="sm" /> : null}
          Send Message
        </Button>
      </form>
    </Form>
  );
}

export { ContactForm };
