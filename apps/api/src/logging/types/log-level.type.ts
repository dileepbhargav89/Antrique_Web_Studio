// Mirrors apps/api/src/config/env.validation.ts's LOG_LEVEL enum exactly —
// one log-level vocabulary for the whole app, not a second one invented
// here. If this ever needs to change, change it in env.validation.ts first
// and update this type to match, not the other way around.
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
