export type HealthCheckStatus = 'ok' | 'error';

export interface HealthCheckResult {
  status: HealthCheckStatus;
  timestamp: string;
  checks?: Record<string, HealthCheckStatus>;
}
