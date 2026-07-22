import { LogLevel } from './log-level.type';
import { LogContext } from './log-context.type';
import { LogMetadata } from './log-metadata.type';

// The data contract for a single log record — deliberately independent of
// how it's formatted (LogFormatter) or where it goes (LogTransport), so
// either can change without touching this shape or its producers.
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: LogContext;
  metadata?: LogMetadata;
}
