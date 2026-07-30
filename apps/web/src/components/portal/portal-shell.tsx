'use client';

import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/layout/sidebar';
import { Footer } from '@/components/layout/footer';
import { DesktopNav } from '@/components/navigation/desktop-nav';
import { PORTAL_NAV_ITEMS } from '@/config/navigation';
import { useUiStore } from '@/store/ui-store';
import { PortalHeader } from './portal-header';

const CommandPalette = dynamic(
  () => import('./command-palette').then((mod) => mod.CommandPalette),
  { ssr: false },
);

/**
 * The shared portal application shell every future business page renders inside
 * (`app/(portal)/layout.tsx`). `CommandPalette` is lazy-loaded (`ssr: false`) so `cmdk`'s
 * search weight isn't part of the initial portal bundle — a command palette has no
 * meaningful server-rendered state, so `ssr: false` costs nothing here.
 */
function PortalShell({ children }: { children: React.ReactNode }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex min-h-svh">
      <Sidebar collapsed={collapsed} className="hidden lg:flex">
        <DesktopNav items={PORTAL_NAV_ITEMS} collapsed={collapsed} />
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalHeader />
        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <Footer variant="compact" />
      </div>
      <CommandPalette />
    </div>
  );
}

export { PortalShell };
