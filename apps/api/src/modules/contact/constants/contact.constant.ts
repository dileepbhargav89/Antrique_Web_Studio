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
