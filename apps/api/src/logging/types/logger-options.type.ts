import { LogLevel } from './log-level.type';
import { LogFormat } from './log-format.type';

// The shape a future concrete Logger is configured with — ties LogLevel/
// LogFormat together for whatever initializes an implementation (e.g. a
// future LoggerModule.forRoot()-style API reading `loggingConfig`/
// `appConfig`, Phase 1.2B). Not consumed anywhere yet.
export interface LoggerOptions {
  level: LogLevel;
  format: LogFormat;
}
