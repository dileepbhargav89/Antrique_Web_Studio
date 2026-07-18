import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Configuration for *serving* OpenAPI docs (no Swagger UI is wired up
// yet — Phase 1.2B+). Not the contract itself, which is
// packages/api-contract/openapi/openapi.yaml (authoritative per CLAUDE.md).
export default registerAs('swagger', () => {
  const env = validateEnv();
  return {
    enabled: env.SWAGGER_ENABLED,
    path: env.SWAGGER_PATH,
  };
});
