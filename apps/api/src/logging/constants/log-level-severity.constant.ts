import { LogLevel } from '../types/log-level.type';

// Ascending severity → ascending verbosity, mirroring
// env.validation.ts's LOG_LEVEL enum order exactly (fatal first, trace
// last). A configured level enables itself plus everything less verbose
// (lower rank) and suppresses everything more verbose (higher rank) — see
// logger.service.ts's isEnabled().
export const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};
