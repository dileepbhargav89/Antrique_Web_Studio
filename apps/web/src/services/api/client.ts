import {
  request,
  requestBlob,
  type GetOptions,
  type QueryParams,
  type RequestOptions,
} from './request';

export const apiClient = {
  get: <T, Q = QueryParams>(path: string, options?: GetOptions<Q>) =>
    request<T, Q>(path, { ...options, method: 'GET' }),

  getBlob: (path: string, options?: GetOptions) => requestBlob(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export { ApiError, type ApiErrorBody } from './http-error';
export type { RequestOptions } from './request';
