'use client';

import { DetailPageHeader } from '@/components/data/detail-page-header';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranding } from '@/features/admin/hooks/use-settings';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { AdminNav } from '../admin-nav';
import { BrandingSettingsForm } from './branding-settings-form';

function SettingsPage() {
  const brandingQuery = useBranding();

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader
        title="Settings"
        subtitle="Company branding used on quotation PDFs and other client-facing documents."
      />
      <AdminNav />

      {brandingQuery.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {brandingQuery.error ? (
        <ErrorState
          {...getErrorCopy(normalizeError(brandingQuery.error))}
          onRetry={() => brandingQuery.refetch()}
        />
      ) : null}

      {brandingQuery.data ? <BrandingSettingsForm branding={brandingQuery.data} /> : null}
    </div>
  );
}

export { SettingsPage };
