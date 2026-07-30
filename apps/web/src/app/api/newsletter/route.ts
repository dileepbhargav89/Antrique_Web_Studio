import { NextResponse } from 'next/server';
import { newsletterFormSchema } from '@/lib/validation/newsletter';
import { BackendServiceError, callBackendService } from '@/lib/server/backend-client';

/**
 * Real (Phase 7) — proxies to the real backend's `POST /newsletter-subscribers`
 * (`apps/api/src/modules/newsletter/`), server-to-server via
 * `lib/server/backend-client.ts`. Persists the subscription (idempotent
 * upsert-by-email on the backend) and fires a confirmation email
 * (fire-and-forget on the backend side). No longer a placeholder.
 */
export async function POST(request: Request) {
  const parsed = newsletterFormSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }

  try {
    await callBackendService('/newsletter-subscribers', parsed.data);
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
