'use client';

import { useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@/lib/query/query-keys';
import { listProductCustomizations } from '../api/product-customizations';
import { listFabrics } from '../api/fabrics';
import type { ProductCustomizationListParams, FabricListParams } from '@/types/api/bespoke';

export const productCustomizationKeys = createQueryKeys('product-customizations');
export const fabricKeys = createQueryKeys('fabrics');

/** ProductCustomization is one-to-one per product (confirmed — creating a second for the
 * same product 409s), so "the customization for this product" is `items[0]` of a
 * `productId`-filtered list; there's no `GET /product-customizations/by-product/:id`. */
export function useProductCustomizationForProduct(productId: string) {
  const params: ProductCustomizationListParams = { productId, limit: 1 };
  const query = useQuery({
    queryKey: productCustomizationKeys.list(params),
    queryFn: ({ signal }) => listProductCustomizations(params, signal),
    enabled: Boolean(productId),
  });
  return {
    ...query,
    data: query.data?.items[0],
  };
}

export function useFabricsForProduct(productId: string) {
  const params: FabricListParams = { productId, limit: 50, status: 'ACTIVE' };
  return useQuery({
    queryKey: fabricKeys.list(params),
    queryFn: ({ signal }) => listFabrics(params, signal),
    enabled: Boolean(productId),
  });
}
