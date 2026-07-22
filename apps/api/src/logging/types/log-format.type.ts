// Mirrors apps/api/src/config/env.validation.ts's LOG_FORMAT enum exactly
// (config/logging/logging.config.ts's `format` field) — same reasoning as
// log-level.type.ts.
export type LogFormat = 'json' | 'pretty';
