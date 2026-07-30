'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { StatusBadge, type StatusTone } from '@/components/data/status-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProject } from '@/features/projects/hooks/use-projects';
import { useUpdateProject, useArchiveProject } from '@/features/projects/hooks/use-project-actions';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatDate } from '@/utils/date';
import { ROUTES } from '@/config/routes';
import { MilestonesTab } from './milestones-tab';
import { TasksTab } from './tasks-tab';
import { FilesTab } from './files-tab';
import { ActivityTab } from './activity-tab';
import type { ProjectStatus, ProjectUpdatableStatus } from '@/types/api/projects';

const STATUS_TONE: Record<ProjectStatus, StatusTone> = {
  DRAFT: 'muted',
  ACTIVE: 'success',
  IN_REVIEW: 'warning',
  LAUNCHED: 'success',
  MAINTENANCE: 'muted',
  ARCHIVED: 'destructive',
};

const UPDATABLE_STATUSES: ProjectUpdatableStatus[] = [
  'DRAFT',
  'ACTIVE',
  'IN_REVIEW',
  'LAUNCHED',
  'MAINTENANCE',
];

interface ProjectDetailProps {
  id: string;
}

function ProjectDetail({ id }: ProjectDetailProps) {
  const router = useRouter();
  const { data: project, isLoading, error, refetch } = useProject(id);
  const updateProject = useUpdateProject(id);
  const archiveProject = useArchiveProject(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    const { title, description } = getErrorCopy(normalizeError(error));
    return <ErrorState title={title} description={description} onRetry={() => refetch()} />;
  }

  if (!project) return null;

  const isArchived = project.status === 'ARCHIVED';

  return (
    <div className="flex flex-col gap-8">
      <DetailPageHeader
        title={project.name}
        subtitle={project.summary ?? undefined}
        status={<StatusBadge label={project.status} tone={STATUS_TONE[project.status]} />}
        actions={
          isArchived ? null : (
            <div className="flex items-center gap-2">
              <Select
                value={project.status}
                onValueChange={(value) =>
                  updateProject.mutate({ status: value as ProjectUpdatableStatus })
                }
              >
                <SelectTrigger aria-label="Project status" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UPDATABLE_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={archiveProject.isPending}
                onClick={async () => {
                  await archiveProject.mutateAsync();
                  router.push(ROUTES.portal.projects);
                }}
              >
                Archive
              </Button>
            </div>
          )
        }
      />

      <section className="grid gap-6 sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground text-xs">Completion</p>
          <p className="text-sm font-medium">{project.completionPercent}%</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Start date</p>
          <p className="text-sm font-medium">
            {project.startDate ? formatDate(project.startDate) : '—'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Members</p>
          <p className="text-sm font-medium">{project.members.length}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Created</p>
          <p className="text-sm font-medium">{formatDate(project.createdAt)}</p>
        </div>
      </section>

      <Tabs defaultValue="milestones">
        <TabsList>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="milestones" className="pt-6">
          <MilestonesTab projectId={id} />
        </TabsContent>
        <TabsContent value="tasks" className="pt-6">
          <TasksTab projectId={id} />
        </TabsContent>
        <TabsContent value="files" className="pt-6">
          <FilesTab projectId={id} />
        </TabsContent>
        <TabsContent value="activity" className="pt-6">
          <ActivityTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export { ProjectDetail };
