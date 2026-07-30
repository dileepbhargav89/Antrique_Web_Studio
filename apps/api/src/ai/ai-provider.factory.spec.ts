import { AiProviderFactory } from './ai-provider.factory';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';

function createFactory(
  defaultProvider: 'anthropic' | 'openai' | 'gemini' | 'openrouter' = 'anthropic',
) {
  return new AiProviderFactory({
    defaultProvider,
    anthropic: { apiKey: 'sk-test', model: 'claude-sonnet-4-5' },
    openai: { apiKey: undefined, model: 'gpt-4o' },
    gemini: { apiKey: undefined, model: 'gemini-2.0-flash' },
    openrouter: { apiKey: undefined, model: 'anthropic/claude-sonnet-4.5' },
  });
}

describe('AiProviderFactory', () => {
  it('resolves the configured default provider when none is requested', () => {
    const factory = createFactory('anthropic');

    const adapter = factory.resolve();

    expect(adapter).toBeInstanceOf(AnthropicAdapter);
    expect(adapter.provider).toBe('anthropic');
  });

  it('resolves an explicitly requested provider over the default', () => {
    const factory = createFactory('anthropic');

    expect(factory.resolve('openai')).toBeInstanceOf(OpenAiAdapter);
    expect(factory.resolve('gemini')).toBeInstanceOf(GeminiAdapter);
    expect(factory.resolve('openrouter')).toBeInstanceOf(OpenRouterAdapter);
  });

  it('caches and returns the same adapter instance on repeated resolution', () => {
    const factory = createFactory('anthropic');

    const first = factory.resolve('anthropic');
    const second = factory.resolve('anthropic');

    expect(first).toBe(second);
  });

  it('reports isConfigured accurately per adapter', () => {
    const factory = createFactory('anthropic');

    expect(factory.resolve('anthropic').isConfigured).toBe(true);
    expect(factory.resolve('openai').isConfigured).toBe(false);
  });
});
