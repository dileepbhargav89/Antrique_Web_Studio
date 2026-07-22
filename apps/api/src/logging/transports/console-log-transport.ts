import { Inject, Injectable } from '@nestjs/common';
import { LogTransport } from '../interfaces/log-transport.interface';
import { LogFormatter } from '../interfaces/log-formatter.interface';
import { LogEntry } from '../types/log-entry.type';
import { LOG_FORMATTER } from '../tokens/logging.tokens';

// The console-based transport this phase ships — good enough for local
// development and small deployments, matching this project's "named tech
// = default, start simple" convention. Not environment-gated: a transport
// that silently drops every log line outside development, with no
// replacement configured, would be worse than one that logs everywhere.
// A production-grade transport (file/cloud) is later, unscoped work — a
// rebind in logging.module.ts, not a branch added here.
@Injectable()
export class ConsoleLogTransport implements LogTransport {
  constructor(@Inject(LOG_FORMATTER) private readonly formatter: LogFormatter) {}

  write(entry: LogEntry): void {
    const line = this.formatter.format(entry);

    switch (entry.level) {
      case 'fatal':
      case 'error':
        console.error(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      default:
        // Intentional application logging (this class's whole purpose),
        // not a leftover debug statement — the repo's no-console rule
        // already allows warn/error (see packages/config/eslint/base.cjs);
        // info/debug/trace need the same explicit opt-in console.log gets
        // elsewhere in this repo (main.ts, prisma/seed.ts).
        // eslint-disable-next-line no-console
        console.log(line);
    }
  }
}
