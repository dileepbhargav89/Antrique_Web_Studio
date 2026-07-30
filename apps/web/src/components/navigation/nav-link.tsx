'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types/navigation';

export interface NavLinkProps {
  item: Pick<NavItem, 'href' | 'label' | 'icon'>;
  onNavigate?: () => void;
  /** Visually hides the label (`sr-only`) for a collapsed sidebar — the label stays in
   * the DOM for screen readers/keyboard users rather than being removed outright. */
  hideLabel?: boolean;
  className?: string;
}

/** Prefix-matches nested routes (e.g. `/projects/123` highlights the `/projects` item);
 * exact-or-prefix-with-trailing-slash avoids `/dashboard` also matching an unrelated item
 * that merely shares its leading characters. */
function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The one place active-route detection lives — every nav surface (desktop sidebar,
 * mobile drawer, future breadcrumb trail) renders through this, not its own `usePathname`
 * check. */
function NavLink({ item, onNavigate, hideLabel, className }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        'focus-visible:ring-sidebar-ring focus-visible:ring-2 focus-visible:outline-none',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span className={cn('truncate', hideLabel && 'sr-only')}>{item.label}</span>
    </Link>
  );
}

export { NavLink };
