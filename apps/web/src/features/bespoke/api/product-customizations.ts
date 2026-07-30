import { apiClient } from '@/services/api/client';
import type { PaginatedResponse } from '@/types/api/common';
import type { ProductCustomization, ProductCustomizationListParams } from '@/types/api/bespoke';

export function listProductCustomizations(
  params: ProductCustomizationListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<ProductCustomization>> {
  return apiClient.get<PaginatedResponse<ProductCustomization>, ProductCustomizationListParams>(
    'product-customizations',
    {
      query: params,
      signal,
    },
  );
}
