# TanStack Query conventions

Conventions only — no business queries exist yet (that's the point of this
phase). Global `QueryClient` defaults live in `config/query.ts`, consumed by
`providers/query-provider.tsx`. See that file for the retry policy (queries
retry network/5xx up to twice, never a 4xx `ApiError`; mutations never
auto-retry) and the mutation-error-toast convention (queries stay silent —
the component owns error display via `components/ui/error-state.tsx`).

## Query keys

Use `createQueryKeys()` (`lib/query/query-keys.ts`) per entity/feature, not
hand-rolled arrays:

```ts
// features/orders/api/order-keys.ts (illustrative — orders isn't built yet)
export const orderKeys = createQueryKeys('orders');

useQuery({ queryKey: orderKeys.detail(orderId), queryFn: ({ signal }) => apiClient.get(`/orders/${orderId}`, { signal }) });
```

Always pass `queryFn`'s own `signal` through to `apiClient` — cancellation
(query-key change, unmount, refetch) is already fully wired in
`services/api/request.ts`; there's nothing else to configure.

## Invalidation

Invalidate at the narrowest key that covers what changed:

```ts
// after updating one order
queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
// after an action whose effect could touch any order in the list (e.g. create)
queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
```

Never invalidate `.all` reflexively — it flushes every list *and* every
detail for that scope, expensive with no matching benefit.

## Optimistic updates

Standard `onMutate`/`onError`-rollback/`onSettled`-invalidate shape:

```ts
useMutation({
  mutationFn: updateOrderStatus,
  onMutate: async (next) => {
    await queryClient.cancelQueries({ queryKey: orderKeys.detail(next.id) });
    const previous = queryClient.getQueryData(orderKeys.detail(next.id));
    queryClient.setQueryData(orderKeys.detail(next.id), next);
    return { previous };
  },
  onError: (_err, next, context) => {
    if (context?.previous) queryClient.setQueryData(orderKeys.detail(next.id), context.previous);
  },
  onSettled: (_data, _err, next) => {
    queryClient.invalidateQueries({ queryKey: orderKeys.detail(next.id) });
  },
});
```

## Prefetching

Server Components prefetch into a `QueryClient` and hydrate it down via
TanStack Query's `HydrationBoundary`:

```tsx
const queryClient = new QueryClient();
await queryClient.prefetchQuery({ queryKey: orderKeys.detail(id), queryFn: ... });
return (
  <HydrationBoundary state={dehydrate(queryClient)}>
    <OrderDetail id={id} />
  </HydrationBoundary>
);
```

## Infinite queries

Key the same way, with the page/cursor folded into `list(filters)` rather
than a separate key shape:

```ts
useInfiniteQuery({
  queryKey: orderKeys.list({ status: 'open' }),
  queryFn: ({ pageParam, signal }) => apiClient.get('/orders', { query: { cursor: pageParam }, signal }),
  initialPageParam: undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```
