'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { ListPagination } from '@/components/data/list-pagination';
import { ResourceTable } from '@/components/data/resource-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useListParams } from '@/components/data/use-list-params';
import { useGenerateReport, useReports } from '@/features/admin/hooks/use-reports';
import { ROUTES } from '@/config/routes';
import { formatDateTime } from '@/utils/date';
import { AdminNav } from '../admin-nav';
import type { Report, ReportType } from '@/types/api/admin';

const REPORT_TYPES: ReportType[] = [
  'SALES_SUMMARY',
  'INVENTORY_SUMMARY',
  'CRM_SUMMARY',
  'BILLING_SUMMARY',
];

function ReportsList() {
  const { params, setParams } = useListParams({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortDirection: 'desc',
  });

  const [genType, setGenType] = useState<ReportType>('SALES_SUMMARY');
  const [genDateFrom, setGenDateFrom] = useState('');
  const [genDateTo, setGenDateTo] = useState('');

  const reportsQuery = useReports({
    page: params.page,
    limit: params.limit,
    sortDirection: params.sortDirection,
  });
  const generateReport = useGenerateReport();

  const columns = useMemo<ColumnDef<Report, unknown>[]>(
    () => [
      {
        accessorKey: 'type',
        header: 'Type',
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            href={`${ROUTES.portal.adminReports}/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.type}
          </Link>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Generated',
        enableSorting: false,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="Reports" subtitle="Generated KPI snapshots." />
      <AdminNav />

      <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-type">Type</Label>
          <Select value={genType} onValueChange={(value) => setGenType(value as ReportType)}>
            <SelectTrigger id="report-type" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-date-from">From (optional)</Label>
          <Input
            id="report-date-from"
            type="date"
            value={genDateFrom}
            onChange={(event) => setGenDateFrom(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-date-to">To (optional)</Label>
          <Input
            id="report-date-to"
            type="date"
            value={genDateTo}
            onChange={(event) => setGenDateTo(event.target.value)}
          />
        </div>
        <Button
          type="button"
          onClick={() =>
            generateReport.mutate({
              type: genType,
              dateFrom: genDateFrom || undefined,
              dateTo: genDateTo || undefined,
            })
          }
          disabled={generateReport.isPending}
        >
          Generate
        </Button>
      </div>

      <ResourceTable
        columns={columns}
        data={reportsQuery.data?.items}
        isLoading={reportsQuery.isLoading}
        error={reportsQuery.error}
        onRetry={() => reportsQuery.refetch()}
        emptyMessage="No reports generated yet."
      />
      {reportsQuery.data ? (
        <ListPagination
          page={reportsQuery.data.page}
          limit={reportsQuery.data.limit}
          total={reportsQuery.data.total}
          onPageChange={(page) => setParams({ page })}
        />
      ) : null}
    </div>
  );
}

export { ReportsList };
