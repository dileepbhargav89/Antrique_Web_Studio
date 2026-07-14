# 06 — Client Dashboard (authenticated portal)

Exists to serve the Discovery insight: dissatisfaction is about *visibility*.
Tenant/project scoped; every side-effect user-initiated and confirmed; accessible;
mobile-first; audit-logged.

## Delivery visibility (the anti-anxiety core)
- **Dashboard home** — "where are we?" in the first viewport.
- **Project tracking** — milestone timeline + staging previews. Review loop:
  team marks submitted → client notified → approve or request changes (confirmed).
- **Timeline** — chronological event feed, auto-assembled.
- **Documents** — shared files; download (signed URL), upload (pre-signed,
  scanned); handover docs at launch.

## Money
- **Invoices** — list/detail/PDF, current status.
- **Payments** — client clicks Pay → confirm → **redirect to hosted gateway**
  (card entered there, never in portal) → webhook marks paid → receipt. Platform
  never handles card data or charges on the client's behalf.

## Collaboration
- **Tickets** — trackable support/change requests with status history.
- **Messages** — project thread; nudges actionable items to tickets.
- **Meetings** — schedule/confirm, join links, notes.

## Account
Profile, Notifications (in-app + email; the retention loop), Settings
(preferences, MFA/sessions via IdP, consent).

## Retention loop
Notifications pull the client back → review + pay → launch + handover → maintenance
retainer (recurring-revenue north-star). Client/admin are two lenses on one data
model (client approves what admin submits; pays what admin issues).
