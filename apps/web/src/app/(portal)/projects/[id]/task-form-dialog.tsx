'use client';

import { useState, type ReactNode, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateTask } from '@/features/projects/hooks/use-task-actions';
import { useMilestones } from '@/features/projects/hooks/use-milestones';
import type { TaskPriority } from '@/types/api/projects';

const PRIORITY_OPTIONS: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const NO_MILESTONE = '__none__';

interface TaskFormDialogProps {
  projectId: string;
  trigger: ReactNode;
}

/** Create-only, plain controlled inputs — same shape as MilestoneFormDialog. No assignee
 * picker: no "list users" endpoint/hook exists on the frontend yet (Admin's user
 * management is out of this phase's scope) — assignment happens server-side (seed data) or
 * via a future task, not this dialog. */
function TaskFormDialog({ projectId, trigger }: TaskFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [milestoneId, setMilestoneId] = useState(NO_MILESTONE);
  const [dueDate, setDueDate] = useState('');
  const createTask = useCreateTask();
  const milestonesQuery = useMilestones({ projectId, limit: 50 });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createTask.mutateAsync({
      projectId,
      milestoneId: milestoneId === NO_MILESTONE ? undefined : milestoneId,
      title,
      description: description || undefined,
      priority,
      dueDate: dueDate || undefined,
    });
    setOpen(false);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setMilestoneId(NO_MILESTONE);
    setDueDate('');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Internal delivery work item — not client-visible.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Draft homepage wireframe"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Milestone</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger aria-label="Milestone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MILESTONE}>None</SelectItem>
                {(milestonesQuery.data?.items ?? []).map((milestone) => (
                  <SelectItem key={milestone.id} value={milestone.id}>
                    {milestone.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
              <SelectTrigger aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-due-date">Due date</Label>
            <Input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createTask.isPending} className="gap-2">
              {createTask.isPending ? <Spinner size="sm" /> : null}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { TaskFormDialog };
