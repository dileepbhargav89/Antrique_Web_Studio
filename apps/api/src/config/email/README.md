# Email configuration

Real (Phase 7). `email.config.ts` — `registerAs('email', ...)`, reading
`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` (both optional — see
`env.validation.ts`'s own comment). Consumed by `apps/api/src/email/
email.service.ts`, the real Resend client wrapper. Distinct from
`notifications/` (which channel/when to notify, not the email transport
itself) and from `modules/admin/notification.service.ts` (the
`Notification` business state-machine, still delivery-mechanism-agnostic).
