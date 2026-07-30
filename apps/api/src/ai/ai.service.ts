import { Injectable } from '@nestjs/common';
import { AiProviderFactory } from './ai-provider.factory';
import type { AiCompletionInput, AiCompletionResult, AiProvider } from './ai-provider.interface';

// The one entrypoint every future AI feature (proposal generator,
// requirement analyzer, task generator, ...) calls — resolves the right
// adapter via AiProviderFactory and returns its result unchanged. Kept
// deliberately thin: this is the seam Step 11 (Usage & Cost Tracking) and
// Step 13 (prompt logging/rate limits) will wrap around later, not
// something to build ahead of a real second consumer.
@Injectable()
export class AiService {
  constructor(private readonly providerFactory: AiProviderFactory) {}

  complete(input: AiCompletionInput, provider?: AiProvider): Promise<AiCompletionResult> {
    const adapter = this.providerFactory.resolve(provider);
    return adapter.complete(input);
  }

  isProviderConfigured(provider?: AiProvider): boolean {
    return this.providerFactory.resolve(provider).isConfigured;
  }
}
