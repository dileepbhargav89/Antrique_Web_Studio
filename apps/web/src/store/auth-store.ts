import { createStore } from './create-store';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  email: string | null;
  /** In-memory only, by design — never persisted (no localStorage, no readable cookie).
   * Lost on a hard refresh; `providers/auth-provider.tsx` recovers it via
   * `GET /api/auth/session` on mount, which reads the httpOnly refresh cookie instead. */
  accessToken: string | null;
  expiresAt: number | null;
  setAuthenticated: (session: {
    email: string;
    accessToken: string;
    expiresAt: number | null;
  }) => void;
  setUnauthenticated: () => void;
}

/** Cross-cutting session state — see `store/README.md` for why this lives here rather
 * than in a feature directory. Selected narrowly by consumers (`useAuthStore((s) =>
 * s.status)`), not destructured whole, to avoid unnecessary re-renders. */
export const useAuthStore = createStore<AuthState>('auth', (set) => ({
  status: 'loading',
  email: null,
  accessToken: null,
  expiresAt: null,
  setAuthenticated: ({ email, accessToken, expiresAt }) =>
    set({ status: 'authenticated', email, accessToken, expiresAt }),
  setUnauthenticated: () =>
    set({ status: 'unauthenticated', email: null, accessToken: null, expiresAt: null }),
}));
