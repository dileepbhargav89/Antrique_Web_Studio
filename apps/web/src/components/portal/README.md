# components/portal

The application shell `app/(portal)/layout.tsx` composes — sidebar,
header, breadcrumbs, user menu, notification center, command palette. See
`docs/architecture/application-runtime.md` for the full shell/navigation
architecture.

- `portal-shell.tsx` — top-level composition; owns the lazy (`ssr: false`)
  `CommandPalette` import.
- `portal-header.tsx` — mobile nav trigger, sidebar collapse toggle,
  breadcrumbs, command-palette trigger, notification bell, user menu.
- `breadcrumbs.tsx` — built from `usePathname()`, not a per-page prop.
- `user-menu.tsx` — session `email` + logout (the one real, fully-wired
  auth action this phase ships).
- `notification-center.tsx` — real data via `features/admin/hooks/
  use-notifications.ts` (`useNotifications`/`useRetryNotification`, the
  same hooks `/admin/notifications` uses), distinct from `sonner`'s toast
  queue. Read-only list + retry-on-failed only — the backend has no
  mark-read/dismiss endpoints.
- `command-palette.tsx` — mocked static entries (`config/navigation.ts`),
  no fuzzy business search yet.

No business/module-specific navigation lives here — `config/navigation.ts`
is intentionally the one place nav items are listed.
