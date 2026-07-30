# modules/newsletter

Real (Phase 7). `NewsletterSubscriber` is a new model, added this phase —
no newsletter/subscriber concept existed anywhere in this schema before
(confirmed: `ContactRequest` is message-based inbound, not subscription
state — see `schema.prisma`'s own comment on the new model for why it
isn't reused instead). `POST /newsletter-subscribers` — public,
unauthenticated, throttled, upsert-by-email (subscribing an
already-subscribed email is a no-op success; re-subscribing a previously
unsubscribed email flips it back to `SUBSCRIBED`), fires a confirmation
email fire-and-forget via `EmailModule`.

## What's built

Subscribe only (create/upsert). Uniqueness per tenant+email is enforced
at the application layer (`NewsletterSubscriberRepository.findActiveByEmail()`
before create), not a DB constraint — see `schema.prisma`'s own comment
on `NewsletterSubscriber` for the reasoning and the flagged future
hardening.

## What's not built

- No unsubscribe route/link. A real unsubscribe flow needs a token-based
  link (so it's actionable from an email without requiring login) — a
  genuinely separate, larger piece of scope than "subscribe works."
- No admin list/export view.
