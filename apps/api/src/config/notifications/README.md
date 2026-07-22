# Notifications configuration

Placeholder — describes the purpose of this directory. No implementation.

Dispatch-channel configuration (in-app/push/email routing, digest
frequency defaults) — still out of scope (Milestone 11's own "Do NOT
Implement: Email delivery providers, SMS providers, Push notifications").
Distinct from `email/` (the ESP transport itself) and
`apps/api/src/modules/admin/` (the real `Notification` business logic —
Milestone 11; the scaffold this comment used to point at,
`apps/api/src/modules/notifications/`, was an empty, never-implemented
placeholder folder, removed once the real feature landed under
`admin/` instead — see that module's own README for why).
