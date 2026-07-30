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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateClient, useUpdateClient } from '@/features/crm/hooks/use-client-actions';
import { clientFormSchema, type ClientFormValues } from '@/lib/validation/client';
import type { Client, ClientStatus } from '@/types/api/crm';

const STATUS_OPTIONS: ClientStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

/** Empty-string optional fields (from controlled `<Input>`s, which can't be `undefined`)
 * become `undefined` before hitting the API — matches CreateClientDto/UpdateClientDto's
 * own `@IsOptional()` fields, which reject an empty string against `@IsEmail()`. */
function toApiPayload(values: ClientFormValues) {
  return {
    name: values.name,
    industry: values.industry || undefined,
    website: values.website || undefined,
    primaryEmail: values.primaryEmail || undefined,
    primaryPhone: values.primaryPhone || undefined,
  };
}

interface ClientFormDialogProps {
  mode: 'create' | 'edit';
  client?: Client;
  trigger: ReactNode;
  onSuccess?: (client: Client) => void;
}

/** Shared create/edit dialog — this is the portal's first real create/edit entity form
 * (Lead has none; only read + archive/convert actions). `status` is edit-only (a create
 * always starts ACTIVE server-side — see CreateClientDto's own comment), so it's plain
 * local state rather than folded into the Zod-validated `clientFormSchema`. */
function ClientFormDialog({ mode, client, trigger, onSuccess }: ClientFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ClientStatus>(client?.status ?? 'ACTIVE');
  const createClient = useCreateClient();
  const updateClient = useUpdateClient(client?.id ?? '');
  const mutation = mode === 'create' ? createClient : updateClient;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: client?.name ?? '',
      industry: client?.industry ?? '',
      website: client?.website ?? '',
      primaryEmail: client?.primaryEmail ?? '',
      primaryPhone: client?.primaryPhone ?? '',
    },
  });

  async function onSubmit(values: ClientFormValues) {
    const payload = toApiPayload(values);
    const result =
      mode === 'create'
        ? await createClient.mutateAsync(payload)
        : await updateClient.mutateAsync({ ...payload, status });
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
          <DialogTitle>{mode === 'create' ? 'New client' : 'Edit client'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a company profile to the CRM.'
              : "Update this client's company profile."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Fintech" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 98200 11223" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === 'edit' ? (
              <FormItem>
                {/* Plain `Label`, not `FormLabel` — `status` is local `useState`, not an
                    RHF-registered field, and `FormLabel` unconditionally calls `useFormField()`,
                    which throws outside a real `<FormField>` (confirmed live). */}
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as ClientStatus)}>
                  <SelectTrigger aria-label="Client status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending} className="gap-2">
                {mutation.isPending ? <Spinner size="sm" /> : null}
                {mode === 'create' ? 'Create client' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { ClientFormDialog };
