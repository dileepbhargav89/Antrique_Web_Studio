'use client';

import { useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormRequiredIndicator,
} from '@/components/forms/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProject } from '@/features/projects/hooks/use-project-actions';
import { useClients } from '@/features/crm/hooks/use-clients';
import { projectFormSchema, type ProjectFormValues } from '@/lib/validation/project';
import type { Project } from '@/types/api/projects';

interface ProjectFormDialogProps {
  trigger: ReactNode;
  onSuccess?: (project: Project) => void;
}

/** Create-only — mirrors ClientFormDialog's shape, but Project has no edit dialog: status
 * changes happen inline on the Overview tab (project-detail.tsx), not through this form. */
function ProjectFormDialog({ trigger, onSuccess }: ProjectFormDialogProps) {
  const [open, setOpen] = useState(false);
  const createProject = useCreateProject();
  // Wide net (limit 100) — this is a plain <select>-style picker, not a searchable
  // combobox; acceptable for the number of clients a single agency tenant realistically has.
  const clientsQuery = useClients({ page: 1, limit: 100 });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { clientId: '', name: '', summary: '', startDate: '' },
  });

  async function onSubmit(values: ProjectFormValues) {
    const result = await createProject.mutateAsync({
      clientId: values.clientId,
      name: values.name,
      summary: values.summary || undefined,
      startDate: values.startDate || undefined,
    });
    setOpen(false);
    form.reset();
    onSuccess?.(result);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>Start a delivery project for a client.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Client
                    <FormRequiredIndicator />
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="Client">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(clientsQuery.data?.items ?? []).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Name
                    <FormRequiredIndicator />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Storefront Relaunch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What is this project delivering?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createProject.isPending} className="gap-2">
                {createProject.isPending ? <Spinner size="sm" /> : null}
                Create project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { ProjectFormDialog };
