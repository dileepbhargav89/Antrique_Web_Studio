import { Injectable } from '@nestjs/common';
import { DeadLetterEntry, DeadLetterStore } from './interfaces/dead-letter-store.interface';
import { MetricsService } from '../metrics/metrics.service';

// The one real implementation this milestone ships — process-local, lost
// on restart, same explicit trade-off CacheService (Milestone 12) already
// made for the same reason ("infrastructure only," no external store
// introduced). Not a problem for what this milestone builds: there is no
// real job registered yet to ever populate it (see jobs/README.md) — this
// exists so JobRunner has a real DeadLetterStore to depend on and so its
// own tests can assert against real recorded entries, not so production
// dead-letters survive a restart today.
@Injectable()
export class InMemoryDeadLetterStore implements DeadLetterStore {
  private readonly entries: DeadLetterEntry[] = [];

  constructor(private readonly metrics: MetricsService) {}

  // Phase 10, Module 6 (Monitoring) — keeps `jobs_dead_letter_queue_size`
  // in sync with `entries.length` on every mutation, closing the exact
  // gap `docs/architecture/operations.md` §8 already named by title
  // ("dead-letter alerting, retry-exhaustion monitoring... have an
  // obvious place to extend this document when that day comes"). No
  // caller populates this today (zero real jobs run — see this file's
  // own header comment and jobs/README.md), so the gauge reads 0 in
  // practice; real, verified via this class's own spec, ready the moment
  // a future job starts using it.
  record(entry: DeadLetterEntry): void {
    this.entries.push(entry);
    this.metrics.setDeadLetterQueueSize(this.entries.length);
  }

  list(): readonly DeadLetterEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
    this.metrics.setDeadLetterQueueSize(this.entries.length);
  }
}
