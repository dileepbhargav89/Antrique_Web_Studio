import { SessionCleanupJob } from './session-cleanup.job';
import { SessionRepository } from '../repositories/session.repository';

function createFakeSessionRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    deleteExpired: jest.fn(async () => 0),
    ...overrides,
  } as unknown as SessionRepository;
}

describe('SessionCleanupJob', () => {
  it('has the name "session-cleanup"', () => {
    const job = new SessionCleanupJob(createFakeSessionRepository());
    expect(job.name).toBe('session-cleanup');
  });

  it('delegates to SessionRepository.deleteExpired()', async () => {
    const sessionRepository = createFakeSessionRepository();
    const job = new SessionCleanupJob(sessionRepository);

    await job.execute(undefined, { jobId: 'j1', attempt: 1, scheduledAt: new Date() });

    expect(sessionRepository.deleteExpired).toHaveBeenCalledTimes(1);
  });

  it('propagates a repository failure so JobRunner retries it', async () => {
    const sessionRepository = createFakeSessionRepository({
      deleteExpired: jest.fn(async () => {
        throw new Error('connection lost');
      }),
    });
    const job = new SessionCleanupJob(sessionRepository);

    await expect(
      job.execute(undefined, { jobId: 'j1', attempt: 1, scheduledAt: new Date() }),
    ).rejects.toThrow('connection lost');
  });
});
