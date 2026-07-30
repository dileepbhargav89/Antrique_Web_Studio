import { Container } from '@/components/layout/container';
import { Skeleton } from '@/components/ui/skeleton';

/** Next's real Suspense fallback during marketing route transitions — the one loading UI in
 * this route group that actually renders in the live app (every page's own content is static,
 * no client-side data fetching, so nothing else ever shows a loading state). Shaped closer to
 * a real page (a hero-like band + a 3-card grid) rather than 3 generic bars, so the transition
 * reads as "the next page is arriving," not just a spinner-adjacent placeholder. */
export default function MarketingLoading() {
  return (
    <div className="flex flex-col gap-16 py-(--space-section-y) sm:py-(--space-section-y-lg)">
      <Container className="flex flex-col items-center gap-4 text-center">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-2/3 max-w-lg" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-5/6 max-w-sm" />
      </Container>
      <Container className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex flex-col gap-3 rounded-xl border p-6">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </Container>
    </div>
  );
}
