// Route segment — matching modules/auth/constants/auth.constant.ts's
// "one string, one place" convention.
export const CONTACT_REQUEST_ROUTE = 'contact-requests';

// Public write endpoint — same threat model as POST /auth/login (see
// auth.constant.ts's own comment), so the same 5-per-60s tier.
export const CONTACT_REQUEST_THROTTLE_LIMIT = 5;
export const CONTACT_REQUEST_THROTTLE_TTL_MS = 60_000;

// Matches Lead's own real `source` value convention (prisma/seed.ts's
// LEADS array — 'website_contact_form', 'referral', 'outbound') — reused
// here, not invented fresh, so ContactRequest.source stays consistent
// with the one other real "how did this person reach us" field in the
// schema.
export const CONTACT_REQUEST_SOURCE = 'website_contact_form';

// The marketing site's "Get a Quote" wizard (app/(marketing)/quote) posts
// here too now (previously an unwired placeholder — see that route's own
// former header comment) — a distinct source value so triage/reporting
// can tell a quote request apart from a plain contact-form message.
export const QUOTE_REQUEST_SOURCE = 'website_quote_form';

// Allow-list for CreateContactRequestDto's optional `source` override —
// this is a PUBLIC, unauthenticated endpoint, so the value must be
// restricted to known first-party call sites rather than accepting
// arbitrary caller-supplied text (which would otherwise let anyone stamp
// a fake source on inbox rows).
export const ALLOWED_CONTACT_REQUEST_SOURCES = [
  CONTACT_REQUEST_SOURCE,
  QUOTE_REQUEST_SOURCE,
] as const;
