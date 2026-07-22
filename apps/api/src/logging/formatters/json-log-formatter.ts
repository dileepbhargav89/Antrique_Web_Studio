import { Injectable } from '@nestjs/common';
import { LogFormatter } from '../interfaces/log-formatter.interface';
import { LogEntry } from '../types/log-entry.type';

// The only LogFormatter implementation this phase builds — matches
// loggerOptions.format's 'json' value. 'pretty' has no formatter yet
// (out of scope, see logging.module.ts); this class doesn't branch on
// format at all, it only ever produces JSON.
@Injectable()
export class JsonLogFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify(
      {
        level: entry.level,
        message: entry.message,
        timestamp: entry.timestamp.toISOString(),
        ...(entry.context !== undefined ? { context: entry.context } : {}),
        ...(entry.metadata !== undefined ? { metadata: entry.metadata } : {}),
      },
      JsonLogFormatter.replacer,
    );
  }

  // Error's own properties (message, stack) are non-enumerable, so plain
  // JSON.stringify(someError) silently produces "{}" — a near-certain
  // occurrence the moment any caller does
  // `logger.error('X failed', { error: err })`. This replacer runs for
  // every key JSON.stringify visits (nested included), so an Error
  // anywhere in `metadata` — not just at the top level — is caught.
  private static replacer(_key: string, value: unknown): unknown {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    return value;
  }
}
