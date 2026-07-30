import type { ApiErrorBody } from '@/services/api/http-error';

export interface NormalizedApiError {
  kind: 'api';
  statusCode: number;
  message: string;
  body: ApiErrorBody;
}

export interface NormalizedNetworkError {
  kind: 'network';
  message: string;
}

export interface NormalizedUnexpectedError {
  kind: 'unexpected';
  message: string;
  cause: unknown;
}

export type NormalizedError =
  NormalizedApiError | NormalizedNetworkError | NormalizedUnexpectedError;
