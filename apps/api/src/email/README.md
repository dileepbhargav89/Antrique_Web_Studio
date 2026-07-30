# email/

Real (Phase 7) — top-level infrastructure, not a domain module (matches
`jobs/`/`cache/`/`queue/`'s own placement: cross-cutting, no tenant
scoping of its own, consumed by more than one business module).

- `email.service.ts` — `EmailService.send({to, subject, html})`, a thin
  wrapper over the `resend` package. Reads config from
  `config/email/email.config.ts` (`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS`,
  both optional). No-ops with a logged warning (`{status: 'skipped'}`)
  when unset — this app must keep working with zero real email
  credentials — instead of throwing.
- `jobs/send-email.job.ts` — `SendEmailJob`, a `Job<SendEmailInput>`
  implementation (`apps/api/src/jobs/`) — the real first consumer that
  infrastructure's own README predicted. Callers (`ContactRequestService`,
  `NewsletterSubscriberService`) run this fire-and-forget through
  `JobRunner.run()`, never awaited in the request/response path — a slow
  or down email provider must never delay or fail the HTTP response a
  marketing-site visitor sees.
- `email.module.ts` — `@Global()`, same precedent as `TokenModule`/
  `PasswordModule`/`CacheModule`/`JobsModule`.

Distinct from `modules/admin/notification.service.ts` (the `Notification`
model's own business state-machine — still delivery-mechanism-agnostic,
per that file's own header comment) and from `config/notifications/`
(dispatch-channel routing config, still an unbuilt placeholder).
