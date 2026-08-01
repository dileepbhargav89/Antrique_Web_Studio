import { NextResponse } from 'next/server';
import { quoteFormSchema, PROJECT_TYPES, BUDGET_TIERS, TIMELINES } from '@/lib/validation/quote';
import { BackendServiceError, callBackendService } from '@/lib/server/backend-client';

const QUOTE_REQUEST_SOURCE = 'website_quote_form';

function labelFor(values: { value: string; label: string }[], value: string): string {
  return values.find((v) => v.value === value)?.label ?? value;
}

/**
 * Proxies to the real backend's `POST /contact-requests` (same route the
 * marketing contact form uses — see `app/api/contact/route.ts`), tagged
 * with a distinct `source` so triage/reporting can tell a quote request
 * apart from a plain contact-form message. The wizard's own structured
 * fields (project type/budget/timeline) have no dedicated columns on
 * ContactRequest, so they're formatted into the free-text `message` field
 * instead — readable in the admin inbox without a schema change.
 */
export async function POST(request: Request) {
  const parsed = quoteFormSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }

  const { projectType, budgetTier, timeline, details, name, email, company } = parsed.data;
  const message = [
    `Project type: ${labelFor(PROJECT_TYPES, projectType)}`,
    `Budget: ${labelFor(BUDGET_TIERS, budgetTier)}`,
    `Timeline: ${labelFor(TIMELINES, timeline)}`,
    '',
    details,
  ].join('\n');

  try {
    await callBackendService('/contact-requests', {
      name,
      email,
      company,
      message,
      source: QUOTE_REQUEST_SOURCE,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BackendServiceError) {
      return NextResponse.json(
        { statusCode: error.status, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { statusCode: 502, message: 'Unable to reach the server right now.' },
      { status: 502 },
    );
  }
}
