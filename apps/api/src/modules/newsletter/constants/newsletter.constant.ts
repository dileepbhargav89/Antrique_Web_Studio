export const NEWSLETTER_SUBSCRIBER_ROUTE = 'newsletter-subscribers';

// Same public-write threat model as contact-requests/auth-login — see
// modules/contact/constants/contact.constant.ts's own comment.
export const NEWSLETTER_SUBSCRIBER_THROTTLE_LIMIT = 5;
export const NEWSLETTER_SUBSCRIBER_THROTTLE_TTL_MS = 60_000;
