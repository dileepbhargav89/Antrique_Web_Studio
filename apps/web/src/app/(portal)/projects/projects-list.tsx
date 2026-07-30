'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { EnumFilterSelect } from '@/components/data/enum-filter-select';
import { ListPagination } from '@/components/data/list-pagination';
import { ListToolbar } from '@/components/data/list-toolbar';
import { ResourceTable } from '@/components/data/resource-table';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { useListParams } from '@/components/data/use-list-params';
import { Button } from '@/components/ui/button';
import { useProjects } from '@/features/projects/hooks/use-projects';
import { ROUTES } from '@/config/routes';
import { formatDate } from '@/utils/date';
import { ProjectFormDialog } from './project-form-dialog';
import type { Project, ProjectStatus } from '@/types/api/projects';

const STATUS_TONE: Record<ProjectStatus, StatusTone> = {
  DRAFT: 'muted',
  ACTIVE: 'success',
  IN_REVIEW: 'warning',
  LAUNCHED: 'success',
  MAINTENANCE: 'muted',
  ARCHIVED: 'destructive',
};

function ProjectsList() {
  const router = useRouter();
  const { params, setParams, clearFilters } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
    filterKeys: ['status'],
  });

  const projectsQuery = useProjects({
    page: params.page,
    limit: params.limit,
    search: params.search || undefined,
    status: params.filters.status as ProjectStatus | undefined,
  });

  const columns = useMemo<ColumnDef<Project, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.projects}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) => (
          <StatusBadge label={row.original.status} tone={STATUS_TONE[row.original.status]} />
        ),
      },
      {
        accessorKey: 'startDate',
        header: 'Start date',
        enableSorting: false,
        cell: ({ row }) => (row.original.startDate ? formatDate(row.original.startDate) : '—'),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  const hasActiveFilters = Boolean(params.search || params.filters.status);

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader
        title="Projects"
        subtitle="Delivery projects — milestones, tasks, files, and activity."
        actions={
          <ProjectFormDialog
            trigger={<Button type="button">New project</Button>}
            onSuccess={(project) => router.push(`${ROUTES.portal.projects}/${project.id}`)}
          />
        }
      />
      <ListToolbar
        search={params.search}
        onSearchChange={(value) => setParams({ search: value })}
        searchPlaceholder="Search projects..."
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
        data={projectsQuery.data?.items}
        isLoading={projectsQuery.isLoading}
        error={projectsQuery.error}
        onRetry={() => projectsQuery.refetch()}
        emptyMessage="No projects found."
      />
      {projectsQuery.data ? (
        <ListPagination
          page={projectsQuery.data.page}
          limit={projectsQuery.data.limit}
          total={projectsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { ProjectsList };
