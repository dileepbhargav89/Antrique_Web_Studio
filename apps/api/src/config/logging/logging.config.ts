import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// LOG_LEVEL stays under `app` (shipped there in Phase 1.2A, not
// relocated — see configuration.md's CORS/LOG_LEVEL placement note).
// This domain holds logging concerns beyond the level itself.
export default registerAs('logging', () => {
  const env = validateEnv();
  return {
    format: env.LOG_FORMAT,
  };
});
