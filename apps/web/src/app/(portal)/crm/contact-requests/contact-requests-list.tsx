'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { EnumFilterSelect } from '@/components/data/enum-filter-select';
import { ListPagination } from '@/components/data/list-pagination';
import { ListToolbar } from '@/components/data/list-toolbar';
import { ResourceTable } from '@/components/data/resource-table';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { useListParams } from '@/components/data/use-list-params';
import { useContactRequests } from '@/features/crm/hooks/use-contact-requests';
import { ROUTES } from '@/config/routes';
import { formatDate } from '@/utils/date';
import { CrmNav } from '../crm-nav';
import type { ContactRequest, ContactRequestStatus } from '@/types/api/crm';

const STATUS_TONE: Record<ContactRequestStatus, StatusTone> = {
  NEW: 'info',
  CONTACTED: 'warning',
  CONVERTED: 'success',
  SPAM: 'destructive',
  CLOSED: 'muted',
};

function ContactRequestsList() {
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    filterKeys: ['status'],
  });

  const contactRequestsQuery = useContactRequests({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as ContactRequestStatus | undefined,
  });

  const columns = useMemo<ColumnDef<ContactRequest, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Contact',
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.crmContactRequests}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      { accessorKey: 'email', header: 'Email' },
      {
        accessorKey: 'company',
        header: 'Company',
        cell: ({ row }) => row.original.company ?? '—',
      },
      {
        accessorKey: 'source',
        header: 'Source',
        cell: ({ row }) => row.original.source ?? '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status]} />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Received',
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  const hasActiveFilters = Boolean(params.search || params.filters.status);

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader
        title="Contact Requests"
        subtitle="Submissions from the marketing site's contact form and quote wizard."
      />
      <CrmNav />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search contact requests..."
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        filters={
          <EnumFilterSelect
            ariaLabel="Filter by status"
            placeholder="Status"
            allLabel="All statuses"
            options={Object.keys(STATUS_TONE)}
            value={params.filters.status}
            onChange={(value) => setParams({ filters: { status: value } })}
          />
        }
      />
      <ResourceTable
        columns={columns}
        data={contactRequestsQuery.data?.items}
        isLoading={contactRequestsQuery.isLoading}
        error={contactRequestsQuery.error}
        onRetry={() => contactRequestsQuery.refetch()}
        emptyMessage="No contact requests found."
      />
      {contactRequestsQuery.data ? (
        <ListPagination
          page={contactRequestsQuery.data.page}
          limit={contactRequestsQuery.data.limit}
          total={contactRequestsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { ContactRequestsList };
