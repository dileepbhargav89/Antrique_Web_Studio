'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface ModuleSubNavTab {
  href: string;
  label: string;
}

export interface ModuleSubNavProps {
  tabs: readonly ModuleSubNavTab[];
  ariaLabel: string;
}

/**
 * Shared by every module's in-page sub-nav (Inventory/CRM/Billing/Admin) — four
 * near-identical link-based tab strips were duplicated across those modules before this
 * was factored out (found during the Phase 4 Engineering Review). Real routes, not Radix
 * `Tabs` panel-switching, so the URL/back-button/breadcrumbs stay meaningful.
 *
 * Active tab = the longest tab href that's an exact match or a `/`-bounded prefix of the
 * current path — handles Admin's own case, where one tab (`/admin`) is a literal parent of
 * the others (`/admin/notifications`, ...), without a naive `startsWith` also lighting up
 * the parent tab on a child route.
 */
function ModuleSubNav({ tabs, ariaLabel }: ModuleSubNavProps) {
  const pathname = usePathname();

  const activeHref = tabs
    .map((tab) => tab.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <nav aria-label={ariaLabel} className="flex gap-1 border-b">
      {tabs.map((tab) => {
        const isActive = tab.href === activeHref;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { ModuleSubNav };
