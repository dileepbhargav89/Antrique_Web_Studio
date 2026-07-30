'use client';

import { PanelLeftIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { PORTAL_NAV_ITEMS } from '@/config/navigation';
import { useUiStore } from '@/store/ui-store';
import { Breadcrumbs } from './breadcrumbs';
import { NotificationCenter } from './notification-center';
import { UserMenu } from './user-menu';

/**
 * The search field opens the command palette rather than acting like a real search
 * input — an actual `<input>` that accepts typing but does nothing with it would be
 * more misleading than a button styled to look like one.
 */
function PortalHeader() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);

  return (
    <header className="border-border bg-background/80 sticky top-0 z-[var(--z-sticky)] flex h-14 items-center gap-2 border-b px-4 backdrop-blur-glass sm:px-6">
      <MobileNav items={PORTAL_NAV_ITEMS} />
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        <PanelLeftIcon aria-hidden="true" className="size-5" />
      </Button>
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="text-muted-foreground hidden gap-2 sm:inline-flex"
        >
          <SearchIcon aria-hidden="true" className="size-4" />
          Search
          <kbd className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">Ctrl K</kbd>
        </Button>
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  );
}

export { PortalHeader };
