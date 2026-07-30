import { InMemoryDeadLetterStore } from './in-memory-dead-letter.store';
import { MetricsService } from '../metrics/metrics.service';

const ENTRY = {
  jobName: 'test-job',
  context: { jobId: 'id-1', attempt: 3, scheduledAt: new Date('2026-01-01') },
  error: 'boom',
  failedAt: new Date('2026-01-01T00:00:03Z'),
};

// Phase 10, Module 6 (Monitoring) — a real MetricsService, not a mock:
// its own local Registry (see that class's own comment) makes this cheap
// and safe to construct fresh per test, and the metric-value assertions
// below need the real gauge, not a spied no-op.
async function readGauge(metrics: MetricsService): Promise<number> {
  const text = await metrics.getMetrics();
  const match = /^jobs_dead_letter_queue_size (\d+)/m.exec(text);
  return match ? Number(match[1]) : NaN;
}

describe('InMemoryDeadLetterStore', () => {
  it('starts empty', () => {
    const store = new InMemoryDeadLetterStore(new MetricsService());
    expect(store.list()).toEqual([]);
  });

  it('records and lists entries in insertion order', () => {
    const store = new InMemoryDeadLetterStore(new MetricsService());
    store.record(ENTRY);
    store.record({ ...ENTRY, jobName: 'second-job' });

    expect(store.list().map((e) => e.jobName)).toEqual(['test-job', 'second-job']);
  });

  it('list() returns a copy, not the live internal array', () => {
    const store = new InMemoryDeadLetterStore(new MetricsService());
    store.record(ENTRY);

    const snapshot = store.list();
    store.record({ ...ENTRY, jobName: 'second-job' });

    expect(snapshot).toHaveLength(1);
  });

  it('clear() empties the store', () => {
    const store = new InMemoryDeadLetterStore(new MetricsService());
    store.record(ENTRY);
    store.clear();
    expect(store.list()).toEqual([]);
  });

  // Phase 10, Module 6 (Monitoring).
  describe('jobs_dead_letter_queue_size gauge', () => {
    it('starts at 0', async () => {
      const metrics = new MetricsService();
      new InMemoryDeadLetterStore(metrics);

      expect(await readGauge(metrics)).toBe(0);
    });

    it('increments on record()', async () => {
      const metrics = new MetricsService();
      const store = new InMemoryDeadLetterStore(metrics);

      store.record(ENTRY);
      expect(await readGauge(metrics)).toBe(1);

      store.record({ ...ENTRY, jobName: 'second-job' });
      expect(await readGauge(metrics)).toBe(2);
    });

    it('resets to 0 on clear()', async () => {
      const metrics = new MetricsService();
      const store = new InMemoryDeadLetterStore(metrics);

      store.record(ENTRY);
      store.clear();

      expect(await readGauge(metrics)).toBe(0);
    });
  });
});
