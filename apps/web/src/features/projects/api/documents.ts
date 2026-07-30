import { apiClient } from '@/services/api/client';
import { ApiError } from '@/services/api/client';
import { apiConfig } from '@/services/api/config';
import { runRequestInterceptors } from '@/services/api/interceptors';
import type { ApiErrorBody } from '@/services/api/client';
import type { ProjectDocument } from '@/types/api/projects';

export function listProjectDocuments(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectDocument[]> {
  return apiClient.get<ProjectDocument[]>(`projects/${projectId}/documents`, { signal });
}

export function removeProjectDocument(projectId: string, documentId: string): Promise<void> {
  return apiClient.delete<void>(`projects/${projectId}/documents/${documentId}`);
}

/**
 * Multipart upload — bypasses `services/api/request.ts`'s `request()` helper, which always
 * JSON-encodes its body. Reuses the same auth/tenant header interceptor and base URL
 * directly (no retry — retrying a file upload risks a duplicate side effect, same reasoning
 * `request.ts` already applies to every non-GET method).
 */
export async function uploadProjectDocument(
  projectId: string,
  file: File,
): Promise<ProjectDocument> {
  const formData = new FormData();
  formData.append('file', file);

  const init = await runRequestInterceptors({ method: 'POST', body: formData });
  const url = new URL(
    `projects/${projectId}/documents`,
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
  return response.json() as Promise<ProjectDocument>;
}
