'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Fade } from '@/components/motion/fade';
import { ROUTES } from '@/config/routes';
import {
  useFabricsForProduct,
  useProductCustomizationForProduct,
} from '@/features/bespoke/hooks/use-bespoke';
import { useProduct } from '@/features/catalog/hooks/use-products';
import { useCustomers } from '@/features/customers/hooks/use-customer';
import { useWarehouses } from '@/features/inventory/hooks/use-warehouses';
import { useCreateOrder } from '@/features/orders/hooks/use-create-order';
import { getErrorCopy } from '@/lib/errors/error-copy';
import { normalizeError } from '@/lib/errors/normalize-error';
import { formatCurrency } from '@/utils/currency';

const STEPS = ['Order basics', 'Style options', 'Monogram', 'Review'] as const;

interface CustomizeWizardProps {
  productId: string;
}

function CustomizeWizard({ productId }: CustomizeWizardProps) {
  const router = useRouter();
  const stepRef = useRef<HTMLDivElement>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [styleSelections, setStyleSelections] = useState<Record<string, string>>({});
  const [monogramOptionId, setMonogramOptionId] = useState<string | null>(null);
  const [monogramText, setMonogramText] = useState('');

  const productQuery = useProduct(productId);
  const customizationQuery = useProductCustomizationForProduct(productId);
  const fabricsQuery = useFabricsForProduct(productId);
  const warehousesQuery = useWarehouses({ limit: 100, status: 'ACTIVE' });
  const customersQuery = useCustomers(
    { search: debouncedCustomerSearch, limit: 8 },
    debouncedCustomerSearch.length >= 2,
  );
  const createOrder = useCreateOrder();

  const product = productQuery.data;
  const customization = customizationQuery.data;
  const selectedCustomer = customersQuery.data?.items.find(
    (customer) => customer.id === customerId,
  );
  const selectedVariant = product?.variants?.find((variant) => variant.id === variantId);
  const selectedMonogram = customization?.monogramOptions.find(
    (option) => option.id === monogramOptionId,
  );

  useEffect(() => {
    const firstField = stepRef.current?.querySelector<HTMLElement>(
      'input, textarea, button[role="radio"], [role="combobox"]',
    );
    firstField?.focus();
  }, [stepIndex]);

  // Debounced — an undebounced `customerSearch` would fire one `GET /customers` request per
  // keystroke (same reasoning as `list-toolbar.tsx`'s own search debounce).
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedCustomerSearch(customerSearch), 300);
    return () => clearTimeout(timeout);
  }, [customerSearch]);

  const requiredGroups = customization?.styleOptionGroups.filter((group) => group.isRequired) ?? [];
  const missingRequiredGroups = requiredGroups.filter((group) => !styleSelections[group.id]);

  const monogramValid =
    !monogramOptionId ||
    (monogramText.trim().length > 0 &&
      (!selectedMonogram || monogramText.trim().length <= selectedMonogram.maxCharacters) &&
      (!selectedMonogram?.allowedCharacters ||
        [...monogramText.trim()].every((char) =>
          selectedMonogram.allowedCharacters?.includes(char),
        )));

  const stepValid = [
    Boolean(customerId && variantId && warehouseId && Number(quantity) > 0),
    missingRequiredGroups.length === 0,
    monogramValid,
    true,
  ][stepIndex];

  const isLastStep = stepIndex === STEPS.length - 1;

  function goNext() {
    if (stepValid && !isLastStep) setStepIndex((index) => index + 1);
  }

  function goBack() {
    setStepIndex((index) => Math.max(0, index - 1));
  }

  const indicativeUnitPrice = useMemo(() => {
    if (!selectedVariant) return 0;
    let total = Number(selectedVariant.price) || 0;
    for (const groupId of Object.keys(styleSelections)) {
      const group = customization?.styleOptionGroups.find((candidate) => candidate.id === groupId);
      const option = group?.styleOptions.find(
        (candidate) => candidate.id === styleSelections[groupId],
      );
      if (option) total += Number(option.priceAdjustment) || 0;
    }
    if (selectedMonogram) total += Number(selectedMonogram.priceAdjustment) || 0;
    return total;
  }, [selectedVariant, styleSelections, customization, selectedMonogram]);

  async function handleSubmit() {
    if (!customerId || !variantId || !warehouseId || !customization) return;
    const styleOptionIds = Object.values(styleSelections).filter(Boolean);
    const hasSelections = styleOptionIds.length > 0 || Boolean(monogramOptionId);

    const order = await createOrder.mutateAsync({
      customerId,
      items: [
        {
          warehouseId,
          productVariantId: variantId,
          quantity,
          productCustomizationId: customization.id,
          selectedOptions: hasSelections
            ? {
                styleOptionIds: styleOptionIds.length > 0 ? styleOptionIds : undefined,
                monogramOptionId: monogramOptionId ?? undefined,
                monogramText: monogramOptionId ? monogramText.trim() : undefined,
              }
            : undefined,
        },
      ],
    });
    router.push(`${ROUTES.portal.orders}/${order.id}`);
  }

  if (productQuery.isLoading || customizationQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (productQuery.error) {
    const { title, description } = getErrorCopy(normalizeError(productQuery.error));
    return (
      <ErrorState title={title} description={description} onRetry={() => productQuery.refetch()} />
    );
  }

  if (!product) return null;

  if (!customization) {
    return (
      <EmptyState
        title="No customization available"
        description="This product has no active Bespoke customization configured yet."
      />
    );
  }

  if (!product.variants || product.variants.length === 0) {
    return (
      <EmptyState
        title="No purchasable variants"
        description="This product has no variants to order yet."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">Customizing</p>
        <h1 className="font-heading text-2xl font-medium">{product.name}</h1>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs">
          Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]}
        </p>
        <Progress
          value={((stepIndex + 1) / STEPS.length) * 100}
          aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}
        />
      </div>

      <Fade key={stepIndex}>
        <div ref={stepRef} className="flex flex-col gap-5">
          {stepIndex === 0 ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="customer-search">Customer</Label>
                <Input
                  id="customer-search"
                  placeholder="Search by name or email..."
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                />
                {debouncedCustomerSearch.length >= 2 ? (
                  <div className="flex flex-col gap-1 rounded-lg border p-1">
                    {customersQuery.isLoading ? (
                      <Skeleton className="h-8 w-full" />
                    ) : (customersQuery.data?.items.length ?? 0) === 0 ? (
                      <p className="text-muted-foreground p-2 text-sm">No customers found.</p>
                    ) : (
                      (customersQuery.data?.items ?? []).map((customer) => {
                        const label =
                          [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
                          customer.email;
                        return (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => setCustomerId(customer.id)}
                            className={`rounded-md p-2 text-left text-sm hover:bg-muted ${
                              customerId === customer.id ? 'bg-muted font-medium' : ''
                            }`}
                          >
                            {label}
                            <span className="text-muted-foreground ml-2 text-xs">
                              {customer.email}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : null}
                {customerId ? (
                  <p className="text-muted-foreground text-xs">
                    Selected:{' '}
                    <span className="text-foreground font-medium">
                      {selectedCustomer
                        ? [selectedCustomer.firstName, selectedCustomer.lastName]
                            .filter(Boolean)
                            .join(' ') || selectedCustomer.email
                        : customerId}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="variant-select">Variant</Label>
                <Select value={variantId ?? undefined} onValueChange={setVariantId}>
                  <SelectTrigger id="variant-select" className="w-full">
                    <SelectValue placeholder="Select a variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.name ?? variant.sku} — {formatCurrency(Number(variant.price) || 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="warehouse-select">Fulfilling warehouse</Label>
                  <Select value={warehouseId ?? undefined} onValueChange={setWarehouseId}>
                    <SelectTrigger id="warehouse-select" className="w-full">
                      <SelectValue placeholder="Select a warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehousesQuery.data?.items ?? []).map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div className="flex flex-col gap-6">
              {customization.styleOptionGroups.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  This customization has no style option groups — nothing to configure here.
                </p>
              ) : (
                customization.styleOptionGroups.map((group) => (
                  <div key={group.id} className="flex flex-col gap-2">
                    <Label>
                      {group.name}
                      {group.isRequired ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    {group.description ? (
                      <p className="text-muted-foreground text-xs">{group.description}</p>
                    ) : null}
                    <RadioGroup
                      value={styleSelections[group.id] ?? ''}
                      onValueChange={(value) =>
                        setStyleSelections((prev) => ({ ...prev, [group.id]: value }))
                      }
                    >
                      {group.styleOptions.map((option) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <RadioGroupItem
                            value={option.id}
                            id={`style-${option.id}`}
                            disabled={option.status !== 'ACTIVE'}
                          />
                          <Label htmlFor={`style-${option.id}`} className="font-normal">
                            {option.name}
                            {Number(option.priceAdjustment) !== 0 ? (
                              <span className="text-muted-foreground ml-1 text-xs">
                                (+{formatCurrency(Number(option.priceAdjustment) || 0)})
                              </span>
                            ) : null}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="flex flex-col gap-5">
              {customization.monogramOptions.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No monogram options are configured for this product.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="monogram-select">Monogram (optional)</Label>
                    <Select
                      value={monogramOptionId ?? '__none__'}
                      onValueChange={(value) =>
                        setMonogramOptionId(value === '__none__' ? null : value)
                      }
                    >
                      <SelectTrigger id="monogram-select" className="w-full">
                        <SelectValue placeholder="No monogram" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No monogram</SelectItem>
                        {customization.monogramOptions
                          .filter((option) => option.isActive)
                          .map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label} (+{formatCurrency(Number(option.priceAdjustment) || 0)}
                              )
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {monogramOptionId ? (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="monogram-text">Monogram text</Label>
                      <Input
                        id="monogram-text"
                        value={monogramText}
                        onChange={(event) => setMonogramText(event.target.value)}
                        maxLength={selectedMonogram?.maxCharacters}
                      />
                      <p className="text-muted-foreground text-xs">
                        Up to {selectedMonogram?.maxCharacters} characters
                        {selectedMonogram?.allowedCharacters
                          ? ` — allowed: ${selectedMonogram.allowedCharacters}`
                          : ''}
                        .
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-lg border p-4">
                <p className="font-medium">Indicative price</p>
                <p className="text-muted-foreground text-xs">
                  Estimated from the base variant price plus selected option/monogram adjustments —
                  the server computes the real, final price at order creation. This is not a binding
                  quote.
                </p>
                <p className="mt-2 text-2xl font-medium">
                  {formatCurrency(indicativeUnitPrice * (Number(quantity) || 1))}
                </p>
              </div>

              {fabricsQuery.data && fabricsQuery.data.items.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="font-medium">Available fabrics — reference only</p>
                  <p className="text-muted-foreground text-xs">
                    Backend v1.0 has no field to attach a fabric choice to an order line item —
                    these are shown for reference during the conversation with the customer, not
                    submitted with this order.
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {fabricsQuery.data.items.map((fabric) => (
                      <li
                        key={fabric.id}
                        className="rounded-full border px-3 py-1 text-xs"
                        title={fabric.description ?? undefined}
                      >
                        {fabric.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {createOrder.isError ? (
                <p role="alert" className="text-destructive text-sm">
                  Something went wrong creating the order. Please try again.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Fade>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0}>
          Back
        </Button>
        {isLastStep ? (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={createOrder.isPending}
            className="gap-2"
          >
            {createOrder.isPending ? <Spinner size="sm" /> : null}
            {createOrder.isPending ? 'Creating order...' : 'Create order'}
          </Button>
        ) : (
          <Button type="button" onClick={goNext} disabled={!stepValid}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

export { CustomizeWizard };
