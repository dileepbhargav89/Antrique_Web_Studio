import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Phase 8 (AI Workspace) — provider-agnostic AI config. Every provider's
// key is optional (see env.validation.ts's own comment) — AiService throws
// a clear ServiceUnavailableException at the one call site that needs a
// real key (the completion call), not here, same "reduced capability, not
// a boot failure" treatment email/storage already established.
// `defaultProvider` is what AiProviderFactory resolves to when a caller
// doesn't request a specific provider — see ai/ai-provider.factory.ts.
export default registerAs('ai', () => {
  const env = validateEnv();
  return {
    defaultProvider: env.AI_DEFAULT_PROVIDER,
    anthropic: { apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL },
    openai: { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL },
    gemini: { apiKey: env.GOOGLE_AI_API_KEY, model: env.GOOGLE_AI_MODEL },
    openrouter: { apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL },
  };
});
