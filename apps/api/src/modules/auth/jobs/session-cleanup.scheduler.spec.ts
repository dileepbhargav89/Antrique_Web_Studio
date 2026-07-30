import { SessionCleanupScheduler } from './session-cleanup.scheduler';
import { SessionCleanupJob } from './session-cleanup.job';
import { JobRunner } from '../../../jobs';

describe('SessionCleanupScheduler', () => {
  it('runs the SessionCleanupJob through JobRunner on each tick', async () => {
    const jobRunner = {
      run: jest.fn(async () => ({ status: 'succeeded', attempts: 1 })),
    } as unknown as JobRunner;
    const sessionCleanupJob = {} as SessionCleanupJob;
    const scheduler = new SessionCleanupScheduler(jobRunner, sessionCleanupJob);

    await scheduler.run();

    expect(jobRunner.run).toHaveBeenCalledWith(sessionCleanupJob, undefined);
  });
});
