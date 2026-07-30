import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Thin wrapper over Zustand's `create` — every store gets Redux DevTools
 * wiring in development for free, named for easier inspection when
 * multiple stores exist, and a no-op passthrough in production (zero
 * runtime cost). See `store/README.md` for when to reach for a store vs.
 * TanStack Query.
 */
export function createStore<T>(name: string, initializer: StateCreator<T>) {
  return create<T>()(
    devtools(initializer, {
      name,
      enabled: process.env.NODE_ENV === 'development',
    }),
  );
}
