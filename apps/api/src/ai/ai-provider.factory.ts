import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import aiConfig from '../config/ai/ai.config';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import type { AiProvider, AiProviderAdapter } from './ai-provider.interface';

// The strategy/factory this phase's own brief asks for — "No business
// logic should depend directly on one provider" holds because AiService
// (the only thing business logic actually injects) depends on THIS, never
// on a concrete adapter class. Adapters are plain classes instantiated
// here with their own config slice (not `@Injectable()` NestJS providers
// in their own right) — the factory owns their lifecycle, one instance
// per provider, built lazily and cached, same "construct on first use"
// shape `StorageService`'s own S3Client field already follows.
@Injectable()
export class AiProviderFactory {
  private readonly adapters = new Map<AiProvider, AiProviderAdapter>();

  constructor(@Inject(aiConfig.KEY) private readonly config: ConfigType<typeof aiConfig>) {}

  resolve(provider?: AiProvider): AiProviderAdapter {
    const resolvedProvider = provider ?? this.config.defaultProvider;
    const existing = this.adapters.get(resolvedProvider);
    if (existing) {
      return existing;
    }

    const adapter = this.build(resolvedProvider);
    this.adapters.set(resolvedProvider, adapter);
    return adapter;
  }

  private build(provider: AiProvider): AiProviderAdapter {
    switch (provider) {
      case 'anthropic':
        return new AnthropicAdapter(this.config.anthropic);
      case 'openai':
        return new OpenAiAdapter(this.config.openai);
      case 'gemini':
        return new GeminiAdapter(this.config.gemini);
      case 'openrouter':
        return new OpenRouterAdapter(this.config.openrouter);
    }
  }
}
