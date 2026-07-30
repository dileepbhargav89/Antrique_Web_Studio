'use client';

import { DetailPageHeader } from '@/components/data/detail-page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useReport } from '@/features/admin/hooks/use-reports';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDateTime } from '@/utils/date';

interface ReportDetailProps {
  id: string;
}

function ReportDetail({ id }: ReportDetailProps) {
  const { data: report, isLoading, error, refetch } = useReport(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    const { title, description } = getErrorCopy(normalizeError(error));
    return <ErrorState title={title} description={description} onRetry={() => refetch()} />;
  }

  if (!report) return null;

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={report.type}
        subtitle={`Generated ${formatDateTime(report.createdAt)}`}
      />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Snapshot</h2>
        {/* "Download metadata" returns this JSON snapshot directly, not a file — rendered
        as-is rather than fabricating a specific chart/table shape the backend doesn't
        promise. */}
        <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 text-xs">
          {JSON.stringify(report.result, null, 2)}
        </pre>
      </section>

      {report.parameters ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-medium">Parameters</h2>
          <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 text-xs">
            {JSON.stringify(report.parameters, null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

export { ReportDetail };
