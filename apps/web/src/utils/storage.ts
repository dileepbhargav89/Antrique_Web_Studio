/** SSR-safe wrappers — `window` doesn't exist during server rendering. */
function createStorageHelper(getStorage: () => Storage) {
  return {
    get<T>(key: string): T | null {
      if (typeof window === 'undefined') return null;
      try {
        const raw = getStorage().getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    },
    set(key: string, value: unknown): void {
      if (typeof window === 'undefined') return;
      try {
        getStorage().setItem(key, JSON.stringify(value));
      } catch {
        // Storage may be full or disabled (private browsing) — fail silently.
      }
    },
    remove(key: string): void {
      if (typeof window === 'undefined') return;
      getStorage().removeItem(key);
    },
  };
}

export const localStorageHelper = createStorageHelper(() => window.localStorage);
export const sessionStorageHelper = createStorageHelper(() => window.sessionStorage);
