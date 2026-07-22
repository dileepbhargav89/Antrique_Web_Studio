import { JobStatus } from './job-status.type';

export interface JobResult {
  readonly status: JobStatus;
  readonly attempts: number;
  readonly error?: string;
}
