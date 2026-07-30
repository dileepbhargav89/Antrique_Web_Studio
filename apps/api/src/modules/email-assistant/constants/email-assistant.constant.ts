export const EMAIL_ASSISTANT_ROUTE = 'email-assistant';

// Reuses Steps 1-2's own pre-seeded `client-email-v1` template (updated
// this step for its first real consumer — see seed.ts's own comment) —
// no new PromptCategory/template needed, unlike every other Phase 8
// generation feature so far.
export const CLIENT_EMAIL_TEMPLATE_KEY = 'client-email-v1';

// Plain TS union, not a Prisma enum — Step 8's own spec has no "store
// drafts" instruction (contrast Step 7's `ContentDraftType`), so nothing
// persists and there's no column for a DB enum to back.
export const EMAIL_TYPES = [
  'PROPOSAL',
  'FOLLOW_UP',
  'MEETING_REQUEST',
  'PROJECT_UPDATE',
  'INVOICE_REMINDER',
] as const;

export type EmailType = (typeof EMAIL_TYPES)[number];

// Human-readable form of each `EmailType` value for the template's
// `{{emailType}}` variable — same "the model writes a better result from
// a real phrase than a SCREAMING_CASE token" reasoning as
// content-assistant.constant.ts's own `CONTENT_TYPE_LABELS`.
export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  PROPOSAL: 'proposal',
  FOLLOW_UP: 'follow-up',
  MEETING_REQUEST: 'meeting request',
  PROJECT_UPDATE: 'project update',
  INVOICE_REMINDER: 'invoice reminder',
};
