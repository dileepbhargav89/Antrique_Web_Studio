# modules/contact

Real (Phase 7). `ContactRequest` (`schema.prisma`) existed since Phase
1.1A with zero application-layer consumers — this module gives it its
first real one. `POST /contact-requests` — public, unauthenticated,
throttled (5/60s, same tier as `POST /auth/login`), persists the row and
fires a confirmation email (fire-and-forget, via `EmailModule`'s
`SendEmailJob`/`JobRunner`).

## What's built

- Create only. `contact_requests:read`/`write` (seeded in
  `prisma/seed.ts`'s permission catalog) stay **out** of
  `modules/auth/constants/permission.constant.ts` — that file's own rule
  is "add a key only when a real caller needs it," and no authenticated
  list/triage route exists yet.

## What's not built (a real, reasonable follow-up, not silently skipped)

- No `GET /contact-requests` — an admin-side inbox/triage view for
  incoming submissions. Would need the permission keys above wired for
  real, plus a portal UI page.
- No lead-conversion action (`convertedLeadId`) wired to a route — the
  schema/relation to `Lead` already exists, unused.
