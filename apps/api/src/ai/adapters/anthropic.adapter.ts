import { Injectable, ServiceUnavailableException, BadGatewayException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type {
  AiCompletionInput,
  AiCompletionResult,
  AiProvider,
  AiProviderAdapter,
} from '../ai-provider.interface';

export interface AnthropicAdapterConfig {
  apiKey?: string;
  model: string;
}

const DEFAULT_MAX_TOKENS = 1024;

// The real, tested reference adapter (Phase 8) — every other adapter in
// this directory follows this one's shape. Uses the official
// @anthropic-ai/sdk directly (Anthropic is the one provider this phase
// has a real key for); OpenAI/Gemini/OpenRouter use plain `fetch()`
// against each provider's REST API instead of pulling in three more SDKs
// for code that's structurally complete but live-untested.
@Injectable()
export class AnthropicAdapter implements AiProviderAdapter {
  readonly provider: AiProvider = 'anthropic';
  private readonly client: Anthropic | null;

  constructor(private readonly config: AnthropicAdapterConfig) {
    this.client = config.apiKey ? new Anthropic({ apiKey: config.apiKey }) : null;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Anthropic is not configured — set ANTHROPIC_API_KEY (see apps/api/.env.example).',
      );
    }

    const startedAt = Date.now();
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: input.temperature,
        system: input.system,
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });
    } catch (error) {
      // The SDK throws its own `Anthropic.APIError` subclasses, which
      // NestJS's exception filter doesn't recognize — surfaced as an
      // opaque 500 otherwise. Re-thrown as a real HttpException carrying
      // Anthropic's own error message (rate limits, billing, invalid
      // model, ...) so a caller sees the actual cause, not "Internal
      // server error".
      if (error instanceof Anthropic.APIError) {
        throw new BadGatewayException(`Anthropic request failed: ${error.message}`);
      }
      throw error;
    }
    const latencyMs = Date.now() - startedAt;

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      provider: this.provider,
      model: response.model,
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      latencyMs,
      stopReason: response.stop_reason,
    };
  }
}
