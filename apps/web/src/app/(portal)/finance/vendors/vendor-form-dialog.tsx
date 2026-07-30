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
import { useCreateVendor, useUpdateVendor } from '@/features/finance/hooks/use-vendor-actions';
import { vendorFormSchema, type VendorFormValues } from '@/lib/validation/vendor';
import type { Vendor, VendorStatus } from '@/types/api/finance';

const STATUS_OPTIONS: VendorStatus[] = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];

/** Empty-string optional fields (from controlled `<Input>`s, which can't be `undefined`)
 * become `undefined` before hitting the API — matches CreateVendorDto/UpdateVendorDto's
 * own `@IsOptional()` fields, which reject an empty string against `@IsEmail()`. */
function toApiPayload(values: VendorFormValues) {
  return {
    name: values.name,
    slug: values.slug,
    contactName: values.contactName || undefined,
    contactEmail: values.contactEmail || undefined,
    contactPhone: values.contactPhone || undefined,
    gstin: values.gstin || undefined,
    paymentTerms: values.paymentTerms || undefined,
    notes: values.notes || undefined,
  };
}

interface VendorFormDialogProps {
  mode: 'create' | 'edit';
  vendor?: Vendor;
  trigger: ReactNode;
  onSuccess?: (vendor: Vendor) => void;
}

/** Shared create/edit dialog — same pattern `ClientFormDialog` establishes. `status` is
 * edit-only (a create always starts ACTIVE server-side — see CreateVendorDto's own
 * comment), so it's plain local state rather than folded into the Zod-validated
 * `vendorFormSchema`. */
function VendorFormDialog({ mode, vendor, trigger, onSuccess }: VendorFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<VendorStatus>(vendor?.status ?? 'ACTIVE');
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor(vendor?.id ?? '');
  const mutation = mode === 'create' ? createVendor : updateVendor;

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: vendor?.name ?? '',
      slug: vendor?.slug ?? '',
      contactName: vendor?.contactName ?? '',
      contactEmail: vendor?.contactEmail ?? '',
      contactPhone: vendor?.contactPhone ?? '',
      gstin: vendor?.gstin ?? '',
      paymentTerms: vendor?.paymentTerms ?? '',
      notes: vendor?.notes ?? '',
    },
  });

  async function onSubmit(values: VendorFormValues) {
    const payload = toApiPayload(values);
    const result =
      mode === 'create'
        ? await createVendor.mutateAsync(payload)
        : await updateVendor.mutateAsync({ ...payload, status });
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
          <DialogTitle>{mode === 'create' ? 'New vendor' : 'Edit vendor'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add who the agency pays for goods or services.'
              : "Update this vendor's record."}
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
                    <Input placeholder="Vendor name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Slug
                    <FormRequiredIndicator />
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="acme-hosting" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jordan Lee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="billing@vendor.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 98200 11223" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gstin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN</FormLabel>
                  <FormControl>
                    <Input placeholder="22AAAAA0000A1Z5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment terms</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Net 30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional notes" {...field} />
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
                <Select value={status} onValueChange={(value) => setStatus(value as VendorStatus)}>
                  <SelectTrigger aria-label="Vendor status">
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
                {mode === 'create' ? 'Create vendor' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { VendorFormDialog };
