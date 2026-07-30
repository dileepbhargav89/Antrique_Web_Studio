'use client';

import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useComments, useCreateComment } from '@/features/projects/hooks/use-comments';
import { formatDate } from '@/utils/date';

interface TaskCommentsDialogProps {
  taskId: string;
  taskTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function TaskCommentsDialog({ taskId, taskTitle, open, onOpenChange }: TaskCommentsDialogProps) {
  const [body, setBody] = useState('');
  const commentsQuery = useComments({ taskId, limit: 50 });
  const createComment = useCreateComment();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    await createComment.mutateAsync({ taskId, body });
    setBody('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
          <DialogDescription>{taskTitle}</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
          {commentsQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : null}
          {commentsQuery.data?.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No comments yet.</p>
          ) : null}
          {(commentsQuery.data?.items ?? []).map((comment) => (
            <div key={comment.id} className="rounded-md border p-2 text-sm">
              <p>{comment.body}</p>
              <p className="text-muted-foreground text-xs">{formatDate(comment.createdAt)}</p>
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add a comment…"
          />
          <DialogFooter>
            <Button type="submit" disabled={createComment.isPending} className="gap-2">
              {createComment.isPending ? <Spinner size="sm" /> : null}
              Add comment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { TaskCommentsDialog };
