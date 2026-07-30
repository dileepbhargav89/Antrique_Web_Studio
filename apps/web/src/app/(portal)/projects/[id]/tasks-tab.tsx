'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ResourceTable } from '@/components/data/resource-table';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTasks } from '@/features/projects/hooks/use-tasks';
import { useUpdateTask } from '@/features/projects/hooks/use-task-actions';
import { formatDate } from '@/utils/date';
import { TaskFormDialog } from './task-form-dialog';
import { TaskCommentsDialog } from './task-comments-dialog';
import type { Task, TaskStatus } from '@/types/api/projects';

const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  TODO: 'muted',
  IN_PROGRESS: 'info',
  IN_REVIEW: 'warning',
  DONE: 'success',
  BLOCKED: 'destructive',
  CANCELLED: 'muted',
};

const PRIORITY_TONE: Record<Task['priority'], StatusTone> = {
  LOW: 'muted',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'destructive',
};

// Board columns, left to right — same set TASK_STATUS enum defines.
const KANBAN_STATUSES: TaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
  'BLOCKED',
  'CANCELLED',
];

function TaskStatusSelect({ task }: { task: Task }) {
  const updateTask = useUpdateTask(task.id);
  return (
    <Select
      value={task.status}
      onValueChange={(value) => updateTask.mutate({ status: value as TaskStatus })}
    >
      <SelectTrigger aria-label="Task status" className="w-40">
        <StatusBadge label={task.status} tone={STATUS_TONE[task.status]} />
      </SelectTrigger>
      <SelectContent>
        {KANBAN_STATUSES.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TaskCard({ task, onOpenComments }: { task: Task; onOpenComments: (task: Task) => void }) {
  return (
    <Card size="sm" className="gap-2">
      <CardHeader>
        <p className="text-sm font-medium">{task.title}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <StatusBadge label={task.priority} tone={PRIORITY_TONE[task.priority]} />
        {task.dueDate ? (
          <p className="text-muted-foreground text-xs">Due {formatDate(task.dueDate)}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <TaskStatusSelect task={task} />
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenComments(task)}>
            Comments
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TasksTab({ projectId }: { projectId: string }) {
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [commentsTask, setCommentsTask] = useState<Task | null>(null);
  const tasksQuery = useTasks({ projectId, limit: 100 });

  const columns = useMemo<ColumnDef<Task, unknown>[]>(
    () => [
      { accessorKey: 'title', header: 'Title', cell: ({ row }) => row.original.title },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <TaskStatusSelect task={row.original} />,
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <StatusBadge label={row.original.priority} tone={PRIORITY_TONE[row.original.priority]} />
        ),
      },
      {
        accessorKey: 'dueDate',
        header: 'Due',
        cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate) : '—'),
      },
      {
        id: 'comments',
        header: '',
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCommentsTask(row.original)}
          >
            Comments
          </Button>
        ),
      },
    ],
    [],
  );

  const tasks = tasksQuery.data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Select value={view} onValueChange={(value) => setView(value as 'list' | 'kanban')}>
          <SelectTrigger aria-label="View" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="list">List</SelectItem>
            <SelectItem value="kanban">Kanban</SelectItem>
          </SelectContent>
        </Select>
        <TaskFormDialog projectId={projectId} trigger={<Button type="button">New task</Button>} />
      </div>

      {view === 'list' ? (
        <ResourceTable
          columns={columns}
          data={tasksQuery.data?.items}
          isLoading={tasksQuery.isLoading}
          error={tasksQuery.error}
          onRetry={() => tasksQuery.refetch()}
          emptyMessage="No tasks yet."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {KANBAN_STATUSES.map((status) => (
            <div key={status} className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-medium uppercase">{status}</p>
              <div className="flex flex-col gap-2">
                {tasks
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <TaskCard key={task.id} task={task} onOpenComments={setCommentsTask} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {commentsTask ? (
        <TaskCommentsDialog
          taskId={commentsTask.id}
          taskTitle={commentsTask.title}
          open={Boolean(commentsTask)}
          onOpenChange={(open) => !open && setCommentsTask(null)}
        />
      ) : null}
    </div>
  );
}

export { TasksTab };
