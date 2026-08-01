'use client';

import { useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Image from 'next/image';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/forms/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useUpdateBranding, useUploadBrandingLogo } from '@/features/admin/hooks/use-settings';
import { brandingFormSchema, type BrandingFormValues } from '@/lib/validation/branding';
import type { BrandingSettings } from '@/types/api/admin';

/** Empty-string optional fields become `undefined` before hitting the API — same
 * `toApiPayload` convention `client-form-dialog.tsx` establishes; `UpdateBrandingDto`'s
 * `@IsOptional()` fields reject an empty string against `@IsEmail()`. */
function toApiPayload(values: BrandingFormValues) {
  return {
    companyName: values.companyName || undefined,
    tagline: values.tagline || undefined,
    addressLine1: values.addressLine1 || undefined,
    addressLine2: values.addressLine2 || undefined,
    city: values.city || undefined,
    state: values.state || undefined,
    postalCode: values.postalCode || undefined,
    country: values.country || undefined,
    phone: values.phone || undefined,
    email: values.email || undefined,
    website: values.website || undefined,
    taxId: values.taxId || undefined,
    bankDetails: values.bankDetails || undefined,
  };
}

interface BrandingSettingsFormProps {
  branding: BrandingSettings;
}

function BrandingSettingsForm({ branding }: BrandingSettingsFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateBranding = useUpdateBranding();
  const uploadLogo = useUploadBrandingLogo();

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: {
      companyName: branding.companyName ?? '',
      tagline: branding.tagline ?? '',
      addressLine1: branding.addressLine1 ?? '',
      addressLine2: branding.addressLine2 ?? '',
      city: branding.city ?? '',
      state: branding.state ?? '',
      postalCode: branding.postalCode ?? '',
      country: branding.country ?? '',
      phone: branding.phone ?? '',
      email: branding.email ?? '',
      website: branding.website ?? '',
      taxId: branding.taxId ?? '',
      bankDetails: branding.bankDetails ?? '',
    },
  });

  async function onSubmit(values: BrandingFormValues) {
    await updateBranding.mutateAsync(toApiPayload(values));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Company logo</p>
        <p className="text-muted-foreground text-sm">
          Used on quotation PDFs and anywhere else the company brand appears. PNG, JPG, or WebP, up
          to 5MB.
        </p>
        <div className="flex items-center gap-4">
          {branding.logoUrl ? (
            <div className="bg-muted flex h-24 w-24 items-center justify-center overflow-hidden rounded-md border">
              <Image
                src={branding.logoUrl}
                alt="Company logo"
                width={96}
                height={96}
                className="h-full w-full object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex h-24 w-24 items-center justify-center rounded-md border text-xs">
              No logo
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadLogo.mutate(file);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploadLogo.isPending}
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            {uploadLogo.isPending ? <Spinner size="sm" /> : null}
            {branding.logoUrl ? 'Replace logo' : 'Upload logo'}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input placeholder="Antrique Web Studio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tagline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tagline</FormLabel>
                  <FormControl>
                    <Input placeholder="Web software, made predictable." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address line 1</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address line 2</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="postalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Postal code</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+91 98765 43210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="hello@antrique.dev" {...field} />
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
                    <Input placeholder="https://antrique.dev" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax / GSTIN</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bankDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment / bank details</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Account name, number, IFSC/SWIFT — printed on quotation PDFs."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={updateBranding.isPending} className="gap-2">
              {updateBranding.isPending ? <Spinner size="sm" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export { BrandingSettingsForm };
