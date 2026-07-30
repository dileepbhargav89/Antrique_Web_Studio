'use client';

import { MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import type { NavItem } from '@/types/navigation';
import { useUiStore } from '@/store/ui-store';
import { NavLink } from './nav-link';

export interface MobileNavProps {
  items: NavItem[];
}

/**
 * `lg:hidden` on the trigger — the desktop/mobile split is pure Tailwind, no JS
 * breakpoint hook (`config/breakpoints.ts` has no consumer for a reason). Built on the
 * existing `Drawer` (vaul-based `components/ui/drawer.tsx`), which already provides
 * focus trap, Esc-to-close, and return-focus-to-trigger — nothing custom needed for that.
 */
function MobileNav({ items }: MobileNavProps) {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="left">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <MenuIcon aria-hidden="true" className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-sidebar text-sidebar-foreground">
        <DrawerTitle className="sr-only">Navigation</DrawerTitle>
        <nav aria-label="Portal navigation" className="flex flex-col gap-1 p-3">
          {items.map((item) => (
            <NavLink key={item.href} item={item} onNavigate={() => setOpen(false)} />
          ))}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}

export { MobileNav };
