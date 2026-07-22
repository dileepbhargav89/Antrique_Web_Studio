import { LogEntry } from '../types/log-entry.type';

// "How a log entry is rendered" — JSON vs. pretty-printed console output
// (matching config's LOG_FORMAT — see logging.config.ts) — kept separate
// from LogTransport so either can vary independently (a JSON formatter
// feeding a file transport, a pretty formatter feeding console, etc.).
export interface LogFormatter {
  format(entry: LogEntry): string;
}
