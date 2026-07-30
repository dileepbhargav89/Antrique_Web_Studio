'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { PORTAL_NAV_ITEMS } from '@/config/navigation';
import { useUiStore } from '@/store/ui-store';

/**
 * Mocked static entries (`PORTAL_NAV_ITEMS`) — no fuzzy business search yet. Lazy-loaded
 * via `next/dynamic` from `portal-shell.tsx` (`ssr: false`) so `cmdk`'s search weight
 * isn't part of the initial portal bundle, only loading once mounted.
 */
function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(!useUiStore.getState().commandPaletteOpen);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setOpen]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command palette"
      description="Jump to a portal section"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {PORTAL_NAV_ITEMS.map((item) => (
            <CommandItem key={item.href} onSelect={() => navigate(item.href)}>
              <item.icon aria-hidden="true" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export { CommandPalette };
