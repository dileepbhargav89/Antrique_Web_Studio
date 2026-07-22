import { Injectable } from '@nestjs/common';
import { DeadLetterEntry, DeadLetterStore } from './interfaces/dead-letter-store.interface';

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

  record(entry: DeadLetterEntry): void {
    this.entries.push(entry);
  }

  list(): readonly DeadLetterEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }
}
