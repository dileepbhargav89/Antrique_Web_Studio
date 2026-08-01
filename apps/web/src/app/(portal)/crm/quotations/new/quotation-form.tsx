'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { PlusIcon, TrashIcon } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DetailPageHeader } from '@/components/data/detail-page-header';
import { useLeads } from '@/features/crm/hooks/use-leads';
import { useClients } from '@/features/crm/hooks/use-clients';
import { useCreateQuotation } from '@/features/crm/hooks/use-quotation-actions';
import {
  quotationFormSchema,
  DEFAULT_PAYMENT_STAGES,
  PAYMENT_STAGE_PERCENTAGE_TOTAL,
  PAYMENT_STAGE_PERCENTAGE_TOLERANCE,
  type QuotationFormValues,
} from '@/lib/validation/quotation';
import { ROUTES } from '@/config/routes';
import { CrmNav } from '../../crm-nav';

type SubjectType = 'lead' | 'client';

function QuotationForm() {
  const router = useRouter();
  const [subjectType, setSubjectType] = useState<SubjectType>('lead');
  const leadsQuery = useLeads({ limit: 100 });
  const clientsQuery = useClients({ limit: 100 });
  const createQuotation = useCreateQuotation();

  const form = useForm({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      leadId: '',
      clientId: '',
      currency: 'INR',
      notes: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
      paymentStages: DEFAULT_PAYMENT_STAGES.map((stage) => ({ ...stage })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const {
    fields: stageFields,
    append: appendStage,
    remove: removeStage,
  } = useFieldArray({ control: form.control, name: 'paymentStages' });
  const items = form.watch('items');
  const taxAmount = form.watch('taxAmount') ?? 0;
  const discountAmount = form.watch('discountAmount') ?? 0;
  const paymentStages = form.watch('paymentStages');
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );
  const total = subtotal + Number(taxAmount) - Number(discountAmount);
  const stagePercentageTotal = paymentStages.reduce(
    (sum, stage) => sum + (Number(stage.percentage) || 0),
    0,
  );
  const stageTotalBalanced =
    Math.abs(stagePercentageTotal - PAYMENT_STAGE_PERCENTAGE_TOTAL) <=
    PAYMENT_STAGE_PERCENTAGE_TOLERANCE;

  async function onSubmit(values: QuotationFormValues) {
    const quotation = await createQuotation.mutateAsync({
      leadId: values.leadId || undefined,
      clientId: values.clientId || undefined,
      currency: values.currency || undefined,
      taxAmount: values.taxAmount,
      discountAmount: values.discountAmount,
      validUntil: values.validUntil || undefined,
      notes: values.notes || undefined,
      items: values.items,
      paymentStages: values.paymentStages.map((stage) => ({
        label: stage.label,
        triggerNote: stage.triggerNote || undefined,
        percentage: stage.percentage,
      })),
    });
    router.push(`${ROUTES.portal.crmQuotations}/${quotation.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <DetailPageHeader title="New quotation" subtitle="Create a draft proposal." />
      <CrmNav />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
          <div className="flex flex-col gap-3">
            <Label>For</Label>
            <RadioGroup
              value={subjectType}
              onValueChange={(value) => {
                setSubjectType(value as SubjectType);
                form.setValue(value === 'lead' ? 'clientId' : 'leadId', '');
              }}
              className="grid-flow-col justify-start gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="lead" id="subject-lead" />
                <Label htmlFor="subject-lead">A lead</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="client" id="subject-client" />
                <Label htmlFor="subject-client">A client</Label>
              </div>
            </RadioGroup>

            {subjectType === 'lead' ? (
              <FormField
                control={form.control}
                name="leadId"
                render={({ field }) => (
                  <FormItem>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-label="Lead">
                        <SelectValue placeholder="Select a lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {leadsQuery.data?.items.map((lead) => (
                          <SelectItem key={lead.id} value={lead.id}>
                            {lead.contactName} ({lead.contactEmail})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-label="Client">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientsQuery.data?.items.map((client) => (
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
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label>Line items</Label>
            <div className="flex flex-col gap-3">
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_6rem_8rem_auto] items-start gap-2"
                >
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            placeholder="Qty"
                            {...field}
                            value={field.value as string | number}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Unit price"
                            {...field}
                            value={field.value as string | number}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    aria-label="Remove line item"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-2"
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
            >
              <PlusIcon /> Add line item
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <Label>Payment schedule</Label>
            <div className="flex flex-col gap-3">
              {stageFields.map((stage, index) => (
                <div
                  key={stage.id}
                  className="grid grid-cols-[1fr_1fr_6rem_auto] items-start gap-2"
                >
                  <FormField
                    control={form.control}
                    name={`paymentStages.${index}.label`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Stage label" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`paymentStages.${index}.triggerNote`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Due on..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`paymentStages.${index}.percentage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            placeholder="%"
                            {...field}
                            value={field.value as string | number}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={stageFields.length === 1}
                    onClick={() => removeStage(index)}
                    aria-label="Remove payment stage"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit gap-2"
              onClick={() => appendStage({ label: '', triggerNote: '', percentage: 0 })}
            >
              <PlusIcon /> Add payment stage
            </Button>
            <p
              className={
                stageTotalBalanced
                  ? 'text-muted-foreground text-sm'
                  : 'text-destructive text-sm font-medium'
              }
            >
              Stages total {stagePercentageTotal.toFixed(2)}% (must equal 100%)
            </p>
            {form.formState.errors.paymentStages?.root ? (
              <p className="text-destructive text-sm font-medium">
                {form.formState.errors.paymentStages.root.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="taxAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      value={field.value as string | number}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discountAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      value={field.value as string | number}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="validUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valid until</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <FormControl>
                    <Input placeholder="INR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col items-end gap-1 border-t pt-4 text-sm">
            <p>Subtotal: {subtotal.toFixed(2)}</p>
            <p className="font-medium">Total: {total.toFixed(2)}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={createQuotation.isPending} className="gap-2">
              {createQuotation.isPending ? <Spinner size="sm" /> : null}
              Create quotation
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export { QuotationForm };
