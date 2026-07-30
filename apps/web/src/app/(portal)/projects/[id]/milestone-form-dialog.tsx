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
import { useCreateMilestone } from '@/features/projects/hooks/use-milestone-actions';

interface MilestoneFormDialogProps {
  projectId: string;
  trigger: ReactNode;
}

/** Create-only, plain controlled inputs (not react-hook-form/Zod) — a smaller, secondary
 * dialog nested inside the project workspace, not a standalone entity page like
 * ProjectFormDialog/ClientFormDialog. */
function MilestoneFormDialog({ projectId, trigger }: MilestoneFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const createMilestone = useCreateMilestone(projectId);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createMilestone.mutateAsync({
      projectId,
      title,
      description: description || undefined,
      dueDate: dueDate || undefined,
    });
    setOpen(false);
    setTitle('');
    setDescription('');
    setDueDate('');
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New milestone</DialogTitle>
          <DialogDescription>Add a client-visible progress checkpoint.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="milestone-title">Title</Label>
            <Input
              id="milestone-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Design System Handoff"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea
              id="milestone-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="milestone-due-date">Due date</Label>
            <Input
              id="milestone-due-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMilestone.isPending} className="gap-2">
              {createMilestone.isPending ? <Spinner size="sm" /> : null}
              Create milestone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { MilestoneFormDialog };
