'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ResourceTable } from '@/components/data/resource-table';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { useMilestones } from '@/features/projects/hooks/use-milestones';
import { useUpdateMilestone } from '@/features/projects/hooks/use-milestone-actions';
import { formatDate } from '@/utils/date';
import { MilestoneFormDialog } from './milestone-form-dialog';
import type { Milestone, MilestoneStatus } from '@/types/api/projects';

const STATUS_TONE: Record<MilestoneStatus, StatusTone> = {
  PENDING: 'muted',
  IN_PROGRESS: 'info',
  SUBMITTED: 'warning',
  CHANGES_REQUESTED: 'destructive',
  APPROVED: 'success',
};

const STATUS_OPTIONS: MilestoneStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
];

function MilestoneStatusCell({ milestone }: { milestone: Milestone }) {
  const updateMilestone = useUpdateMilestone(milestone.id, milestone.projectId);
  return (
    <Select
      value={milestone.status}
      onValueChange={(value) => updateMilestone.mutate({ status: value as MilestoneStatus })}
    >
      <SelectTrigger aria-label="Milestone status" className="w-44">
        <StatusBadge label={milestone.status} tone={STATUS_TONE[milestone.status]} />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MilestonesTab({ projectId }: { projectId: string }) {
  const milestonesQuery = useMilestones({ projectId, limit: 50 });

  const columns = useMemo<ColumnDef<Milestone, unknown>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            {row.original.description ? (
              <p className="text-muted-foreground text-xs">{row.original.description}</p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <MilestoneStatusCell milestone={row.original} />,
      },
      {
        accessorKey: 'dueDate',
        header: 'Due',
        cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate) : '—'),
      },
      {
        accessorKey: 'completedAt',
        header: 'Completed',
        cell: ({ row }) => (row.original.completedAt ? formatDate(row.original.completedAt) : '—'),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <MilestoneFormDialog
          projectId={projectId}
          trigger={<Button type="button">New milestone</Button>}
        />
      </div>
      <ResourceTable
        columns={columns}
        data={milestonesQuery.data?.items}
        isLoading={milestonesQuery.isLoading}
        error={milestonesQuery.error}
        onRetry={() => milestonesQuery.refetch()}
        emptyMessage="No milestones yet."
      />
    </div>
  );
}

export { MilestonesTab };
