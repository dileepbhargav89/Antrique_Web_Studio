/**
 * Matches the real shape NestJS's default exception filter returns on the
 * (API-frozen) backend — `{ statusCode, message, error }`, where `message`
 * is a human-readable string for most errors but an array of sentences for
 * 400 validation failures. See packages/api-contract/README.md for why this
 * is NOT the RFC 9457 problem-details shape an earlier draft assumed.
 */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly body: ApiErrorBody;

  constructor(statusCode: number, body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join(' ') : body.message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.body = body;
  }

  /** True for 400 validation failures, where `message` is per-field sentences. */
  get isValidationError(): boolean {
    return this.statusCode === 400 && Array.isArray(this.body.message);
  }
}
