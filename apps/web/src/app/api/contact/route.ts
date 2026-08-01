import { NextResponse } from 'next/server';
import { contactFormSchema } from '@/lib/validation/contact';
import { BackendServiceError, callBackendService } from '@/lib/server/backend-client';

/**
 * Real (Phase 7) — proxies to the real backend's `POST /contact-requests`
 * (`apps/api/src/modules/contact/`), server-to-server via
 * `lib/server/backend-client.ts`. Persists the submission and fires a
 * confirmation email (fire-and-forget on the backend side — see that
 * module's own service). No longer a placeholder.
 */
export async function POST(request: Request) {
  const parsed = contactFormSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }

  try {
    // Empty string -> omitted: the backend's own `@IsOptional() @Matches(...)`
    // treats an absent field as "no phone given," but would reject an empty
    // string against its length-7-minimum pattern.
    const { phone, ...rest } = parsed.data;
    await callBackendService('/contact-requests', { ...rest, ...(phone ? { phone } : {}) });
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
