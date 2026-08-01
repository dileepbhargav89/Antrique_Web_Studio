'use client';

import { useEffect, useRef, useState } from 'react';
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Fade } from '@/components/motion/fade';
import {
  BUDGET_TIERS,
  PROJECT_TYPES,
  QUOTE_STEPS,
  TIMELINES,
  quoteFormSchema,
  type QuoteFormValues,
} from '@/lib/validation/quote';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * One question per screen, contact captured last, per-step validation never drops data,
 * user-initiated submit only — the real spec (despite the filename, found in
 * `05-admin-dashboard.md`). Submits to `app/api/quote/route.ts`, which proxies to the
 * real backend's `POST /contact-requests` (same as the marketing contact form).
 */
function QuoteWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const stepRef = useRef<HTMLDivElement>(null);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    // Cast: these select fields are legitimately unset until the user picks one — RHF/
    // Zod handle `undefined` correctly at runtime (the Select shows its placeholder, Zod
    // rejects submission until a value is chosen). TypeScript's DefaultValues<T> has no
    // way to express "required at submit, unset as an initial value" for a literal union.
    // Cast through `unknown` first (Zod's newer literal-union inference no longer overlaps
    // enough with this shape for a direct `as` — same intent as before, same runtime
    // behavior, just the cast TypeScript will actually accept).
    defaultValues: {
      projectType: undefined,
      budgetTier: undefined,
      timeline: undefined,
      details: '',
      name: '',
      email: '',
      company: '',
    } as unknown as QuoteFormValues,
  });

  const step = QUOTE_STEPS[stepIndex];
  const isLastStep = stepIndex === QUOTE_STEPS.length - 1;

  useEffect(() => {
    // A multi-step form must manage focus itself — the browser has no default behavior
    // for moving focus to a step that just appeared without a real navigation.
    const firstField = stepRef.current?.querySelector<HTMLElement>(
      'input, textarea, button[role="combobox"]',
    );
    firstField?.focus();
  }, [stepIndex]);

  // `noUncheckedIndexedAccess` — `stepIndex` is always kept in range by `goNext`/`goBack`
  // below, but the compiler can't prove that from an array index; this is unreachable in
  // practice. Placed after every hook call (same position as the `status === 'success'`
  // early return below) so it never skips a hook — an early return before `useEffect`
  // above would violate the Rules of Hooks.
  if (!step) return null;

  async function goNext() {
    // Re-narrow: TS doesn't carry the outer `if (!step) return null;` guard's narrowing
    // into a nested function body (it could theoretically be called at any later time),
    // even though `step` is only ever read here synchronously during the same render.
    if (!step) return;
    const valid = await form.trigger(step.fields);
    if (valid && !isLastStep) {
      setStepIndex((index) => index + 1);
    }
  }

  function goBack() {
    setStepIndex((index) => Math.max(0, index - 1));
  }

  async function onSubmit(values: QuoteFormValues) {
    setStatus('submitting');
    try {
      const response = await fetch('/api/quote', {
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
      <div
        role="status"
        className="border-border flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center"
      >
        <CheckCircle2Icon aria-hidden="true" className="text-success size-10" />
        <p className="font-heading text-lg font-medium">Thanks — your request is in</p>
        <p className="text-muted-foreground text-sm">
          We&rsquo;ll follow up by email with a scoped quote within one business day.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isLastStep) {
            void form.handleSubmit(onSubmit)(event);
          } else {
            void goNext();
          }
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-xs">
            Step {stepIndex + 1} of {QUOTE_STEPS.length}
          </p>
          <Progress
            value={((stepIndex + 1) / QUOTE_STEPS.length) * 100}
            aria-label={`Step ${stepIndex + 1} of ${QUOTE_STEPS.length}`}
          />
        </div>

        <Fade key={step.id}>
          <div ref={stepRef} className="flex flex-col gap-5">
            <h2 className="font-heading text-xl font-medium">{step.title}</h2>

            {step.id === 'projectType' ? (
              <FormField
                control={form.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Project type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {step.id === 'budgetTier' ? (
              <FormField
                control={form.control}
                name="budgetTier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Budget range</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a budget range" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {BUDGET_TIERS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {step.id === 'timeline' ? (
              <FormField
                control={form.control}
                name="timeline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Timeline</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a timeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMELINES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {step.id === 'details' ? (
              <FormField
                control={form.control}
                name="details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Project details</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={6}
                        placeholder="What are you building? Any specific requirements we should know about?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {step.id === 'contact' ? (
              <div className="flex flex-col gap-5">
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
                        <Input
                          type="email"
                          placeholder="you@company.com"
                          autoComplete="email"
                          {...field}
                        />
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
              </div>
            ) : null}
          </div>
        </Fade>

        {status === 'error' ? (
          <p role="alert" className="text-destructive text-sm">
            Something went wrong submitting your request. Please try again.
          </p>
        ) : null}

        <div className="flex justify-between gap-3">
          <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0}>
            Back
          </Button>
          <Button type="submit" disabled={status === 'submitting'} className="gap-2">
            {status === 'submitting' ? <Spinner size="sm" /> : null}
            {isLastStep ? 'Submit Request' : 'Next'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export { QuoteWizard };
