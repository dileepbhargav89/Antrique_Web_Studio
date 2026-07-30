'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createMutationCache, createQueryCache, defaultQueryOptions } from '@/config/query';

/**
 * One `QueryClient` per component instance, not a module singleton — on
 * the server that would leak cached data across requests/users; in the
 * browser `useState`'s lazy initializer still only runs once per mount.
 * See TanStack Query's own App Router SSR guidance.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
    queryCache: createQueryCache(),
    mutationCache: createMutationCache(),
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
