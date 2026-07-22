import { InMemoryDeadLetterStore } from './in-memory-dead-letter.store';

const ENTRY = {
  jobName: 'test-job',
  context: { jobId: 'id-1', attempt: 3, scheduledAt: new Date('2026-01-01') },
  error: 'boom',
  failedAt: new Date('2026-01-01T00:00:03Z'),
};

describe('InMemoryDeadLetterStore', () => {
  it('starts empty', () => {
    const store = new InMemoryDeadLetterStore();
    expect(store.list()).toEqual([]);
  });

  it('records and lists entries in insertion order', () => {
    const store = new InMemoryDeadLetterStore();
    store.record(ENTRY);
    store.record({ ...ENTRY, jobName: 'second-job' });

    expect(store.list().map((e) => e.jobName)).toEqual(['test-job', 'second-job']);
  });

  it('list() returns a copy, not the live internal array', () => {
    const store = new InMemoryDeadLetterStore();
    store.record(ENTRY);

    const snapshot = store.list();
    store.record({ ...ENTRY, jobName: 'second-job' });

    expect(snapshot).toHaveLength(1);
  });

  it('clear() empties the store', () => {
    const store = new InMemoryDeadLetterStore();
    store.record(ENTRY);
    store.clear();
    expect(store.list()).toEqual([]);
  });
});
