# components/navigation

The reusable navigation system consumed by `components/portal/portal-shell.tsx`.

- `nav-link.tsx` — the one place active-route detection lives
  (`usePathname` + prefix match, `aria-current="page"`). Every other nav
  surface renders through this rather than re-implementing the check.
- `desktop-nav.tsx` — renders inside `Sidebar`'s children slot
  (`components/layout/sidebar.tsx`). `collapsed` hides labels visually
  (`sr-only`, kept in the DOM for assistive tech), not conditionally.
- `mobile-nav.tsx` — a `Drawer`-based (vaul) trigger, `lg:hidden`. The
  desktop/mobile split is pure Tailwind (`hidden lg:flex` / `lg:hidden`),
  not a JS media-query hook.

Nav items come from `config/navigation.ts` (`PORTAL_NAV_ITEMS`) — mocked,
no permission gating yet (out of scope for the runtime-architecture phase;
see `docs/architecture/application-runtime.md`).
