import { JobRunner } from './job-runner.service';
import { InMemoryDeadLetterStore } from './in-memory-dead-letter.store';
import { Job } from './interfaces/job.interface';
import { Logger } from '../logging';

const FAST_RETRY_POLICY = { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1 };

function createRunner() {
  const logger: Logger = {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };
  const deadLetterStore = new InMemoryDeadLetterStore();
  const runner = new JobRunner(logger, deadLetterStore);
  return { runner, logger, deadLetterStore };
}

describe('JobRunner', () => {
  it('returns succeeded on the first successful attempt, without retrying', async () => {
    const { runner } = createRunner();
    const job: Job<{ n: number }> = {
      name: 'succeeds',
      execute: jest.fn().mockResolvedValue(undefined),
    };

    const result = await runner.run(job, { n: 1 }, FAST_RETRY_POLICY);

    expect(result).toEqual({ status: 'succeeded', attempts: 1 });
    expect(job.execute).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds on a later attempt', async () => {
    const { runner } = createRunner();
    const execute = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);
    const job: Job<void> = { name: 'flaky', execute };

    const result = await runner.run(job, undefined, FAST_RETRY_POLICY);

    expect(result).toEqual({ status: 'succeeded', attempts: 2 });
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('moves to the dead-letter store once retries are exhausted', async () => {
    const { runner, deadLetterStore } = createRunner();
    const job: Job<void> = {
      name: 'always-fails',
      execute: jest.fn().mockRejectedValue(new Error('nope')),
    };

    const result = await runner.run(job, undefined, FAST_RETRY_POLICY);

    expect(result).toEqual({
      status: 'dead_letter',
      attempts: FAST_RETRY_POLICY.maxAttempts,
      error: 'nope',
    });
    expect(job.execute).toHaveBeenCalledTimes(FAST_RETRY_POLICY.maxAttempts);

    const entries = deadLetterStore.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ jobName: 'always-fails', error: 'nope' });
  });

  it('passes an incrementing attempt number and a stable jobId through JobContext', async () => {
    const { runner } = createRunner();
    const seenAttempts: number[] = [];
    const seenJobIds = new Set<string>();
    const execute = jest.fn().mockImplementation(async (_payload: void, context) => {
      seenAttempts.push(context.attempt);
      seenJobIds.add(context.jobId);
      if (context.attempt < 2) {
        throw new Error('retry me');
      }
    });
    const job: Job<void> = { name: 'context-check', execute };

    await runner.run(job, undefined, FAST_RETRY_POLICY);

    expect(seenAttempts).toEqual([1, 2]);
    expect(seenJobIds.size).toBe(1);
  });

  it('logs a warning per failed attempt and an error when exhausted', async () => {
    const { runner, logger } = createRunner();
    const job: Job<void> = {
      name: 'always-fails',
      execute: jest.fn().mockRejectedValue(new Error('nope')),
    };

    await runner.run(job, undefined, FAST_RETRY_POLICY);

    expect(logger.warn).toHaveBeenCalledTimes(FAST_RETRY_POLICY.maxAttempts);
    expect(logger.error).toHaveBeenCalledWith(
      'Job exhausted retries — moved to dead-letter store',
      expect.objectContaining({ jobName: 'always-fails' }),
    );
  });
});
