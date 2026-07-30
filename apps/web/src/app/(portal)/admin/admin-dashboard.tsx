'use client';

import { DetailPageHeader } from '@/components/data/detail-page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/components/ui/stats-card';
import { useDashboardOverview } from '@/features/admin/hooks/use-dashboard';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { AdminNav } from './admin-nav';

/** Turns a `metrics` key like `averageOrderValue` into "Average Order Value" — the
 * response DTO is deliberately a loose `Record<string, string | number>` bag (each module
 * computes different metrics), so cards render generically instead of assuming field
 * names. */
function humanizeKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (char) => char.toUpperCase());
}

function AdminDashboard() {
  const { data, isLoading, error, refetch } = useDashboardOverview();

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Admin" subtitle="Cross-module KPIs and system tools." />
      <AdminNav />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        (() => {
          const { title, description } = getErrorCopy(normalizeError(error));
          return <ErrorState title={title} description={description} onRetry={() => refetch()} />;
        })()
      ) : data ? (
        <div className="flex flex-col gap-8">
          <StatsCard label="System errors (24h)" value={data.systemErrorCount24h} />
          {data.modules.map((moduleKpi) => (
            <section key={moduleKpi.module} className="flex flex-col gap-3">
              <h2 className="font-heading text-lg font-medium capitalize">{moduleKpi.module}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(moduleKpi.metrics).map(([key, value]) => (
                  <StatsCard key={key} label={humanizeKey(key)} value={value} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { AdminDashboard };
