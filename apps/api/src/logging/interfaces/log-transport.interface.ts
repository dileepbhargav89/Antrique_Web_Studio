import { LogEntry } from '../types/log-entry.type';

// "Where a log entry goes" — console, file, a cloud logging service —
// abstracted from "what a log entry is" (LogEntry) and "how it's
// rendered" (LogFormatter). A future Logger implementation composes one
// or more transports; consumers of `Logger` never see this interface
// directly.
export interface LogTransport {
  write(entry: LogEntry): void;
}
