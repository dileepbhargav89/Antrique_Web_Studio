import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface UiState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  mobileNavOpen: boolean;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
}

/**
 * Cross-cutting portal shell UI state. Only `sidebarCollapsed` is persisted (a real user
 * preference worth surviving a reload) — `commandPaletteOpen`/`mobileNavOpen` are
 * transient overlay state and would be actively wrong to restore on load.
 *
 * Not built via the shared `createStore()` factory (`store/create-store.ts`) — its
 * generic (`StateCreator<T>`, no mutator type parameters) doesn't compose with `persist`
 * without losing type safety on `set`. Built directly here with the same `devtools`
 * config `createStore()` itself uses, so devtools inspection stays consistent.
 */
export const useUiStore = create<UiState>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        commandPaletteOpen: false,
        mobileNavOpen: false,
        toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      }),
      {
        name: 'antrique-ui',
        partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
      },
    ),
    { name: 'ui', enabled: process.env.NODE_ENV === 'development' },
  ),
);
