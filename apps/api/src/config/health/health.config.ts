import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Configuration only — no health-check controller/service is wired up
// yet. Distinct from apps/api/src/health/ (the future implementation's
// home, still a placeholder).
export default registerAs('health', () => {
  const env = validateEnv();
  return {
    path: env.HEALTH_PATH,
  };
});
