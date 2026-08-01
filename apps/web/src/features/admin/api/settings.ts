import { apiClient, ApiError, type ApiErrorBody } from '@/services/api/client';
import { apiConfig } from '@/services/api/config';
import { runRequestInterceptors } from '@/services/api/interceptors';
import type { BrandingSettings, UpdateBrandingInput } from '@/types/api/admin';

export function getBranding(signal?: AbortSignal): Promise<BrandingSettings> {
  return apiClient.get<BrandingSettings>('settings/branding', { signal });
}

export function updateBranding(input: UpdateBrandingInput): Promise<BrandingSettings> {
  return apiClient.patch<BrandingSettings>('settings/branding', input);
}

/**
 * Multipart upload — same bypass-the-JSON-`request()`-helper shape as
 * `features/projects/api/documents.ts`'s `uploadProjectDocument` (see that
 * file's own comment): reuses the auth/tenant header interceptor and base
 * URL directly, no retry (retrying a file upload risks a duplicate side
 * effect).
 */
export async function uploadBrandingLogo(file: File): Promise<BrandingSettings> {
  const formData = new FormData();
  formData.append('file', file);

  const init = await runRequestInterceptors({ method: 'POST', body: formData });
  const url = new URL(
    'settings/branding/logo',
    `${apiConfig.baseUrl.replace(/\/$/, '')}/`,
  ).toString();

  const response = await fetch(url, init);
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody ?? { statusCode: response.status, message: response.statusText },
    );
  }
  return response.json() as Promise<BrandingSettings>;
}
