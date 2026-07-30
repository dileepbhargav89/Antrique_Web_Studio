// Phase 7 (Real Email) — the one place user-supplied text gets interpolated
// into an HTML email body (ContactRequestService/NewsletterSubscriberService's
// confirmation emails). A plain, framework-agnostic helper, no NestJS
// DI/decorators, same shape as prisma-error.util.ts's own precedent.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
