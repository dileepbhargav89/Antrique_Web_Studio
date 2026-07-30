// Central barrel — same convention as email/index.ts, storage/index.ts.
export { AiModule } from './ai.module';
export { AiService } from './ai.service';
export { AiProviderFactory } from './ai-provider.factory';
export type {
  AiProvider,
  AiCompletionInput,
  AiCompletionResult,
  AiMessage,
  AiProviderAdapter,
} from './ai-provider.interface';
export { AI_PROVIDERS } from './ai-provider.interface';
