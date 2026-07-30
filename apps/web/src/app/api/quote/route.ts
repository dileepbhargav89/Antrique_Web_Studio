import { NextResponse } from 'next/server';
import { quoteFormSchema } from '@/lib/validation/quote';

/**
 * Same honest-placeholder reasoning as `app/api/contact/route.ts` — no real backend
 * lead-capture endpoint exists yet. Validates and logs server-side; a future session
 * wires this to the real CRM once Sprint 3 builds it.
 */
export async function POST(request: Request) {
  const parsed = quoteFormSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }

  // Server-side Route Handler, not client debug output; this *is* the persistence
  // mechanism until a real CRM is wired (see this file's own header comment).
  // eslint-disable-next-line no-console
  console.info('[quote] submission received (not yet persisted — no CRM wired)', {
    projectType: parsed.data.projectType,
    budgetTier: parsed.data.budgetTier,
    timeline: parsed.data.timeline,
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company,
  });

  return NextResponse.json({ ok: true });
}
