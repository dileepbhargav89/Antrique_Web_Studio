// Mirrors apps/api/src/config/env.validation.ts's NODE_ENV enum exactly
// (config/app/app.config.ts's `nodeEnv` field) — same reasoning as
// log-level.type.ts. A future logger choosing pretty-console vs. JSON
// output, or a stricter production log level, branches on this.
export type EnvironmentMode = 'development' | 'test' | 'production';
