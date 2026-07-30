import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  AiCompletionInput,
  AiCompletionResult,
  AiProvider,
  AiProviderAdapter,
} from '../ai-provider.interface';

export interface OpenRouterAdapterConfig {
  apiKey?: string;
  model: string;
}

const DEFAULT_MAX_TOKENS = 1024;
const CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterChatResponse {
  model: string;
  choices: Array<{ message: { content: string | null }; finish_reason: string | null }>;
  usage: { prompt_tokens: number; completion_tokens: number };
}

// OpenRouter's API is OpenAI-compatible — same request/response shape as
// OpenAiAdapter, different base URL and an extra routing header. See
// anthropic.adapter.ts's own header comment for why this is plain
// `fetch()`, not an SDK — structurally complete, live-untested.
@Injectable()
export class OpenRouterAdapter implements AiProviderAdapter {
  readonly provider: AiProvider = 'openrouter';

  constructor(private readonly config: OpenRouterAdapterConfig) {}

  get isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    if (!this.config.apiKey) {
      throw new ServiceUnavailableException(
        'OpenRouter is not configured — set OPENROUTER_API_KEY (see apps/api/.env.example).',
      );
    }

    const startedAt = Date.now();
    const response = await fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        // OpenRouter's own recommended (not required) attribution headers —
        // omitting them still works, just without app-level usage grouping
        // on their dashboard.
        'HTTP-Referer': 'https://antrique.dev',
        'X-Title': 'Antrique Web Studio',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: input.temperature,
        messages: [
          ...(input.system ? [{ role: 'system', content: input.system }] : []),
          ...input.messages.map((message) => ({ role: message.role, content: message.content })),
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceUnavailableException(
        `OpenRouter request failed (${response.status}): ${body}`,
      );
    }

    const latencyMs = Date.now() - startedAt;
    const data = (await response.json()) as OpenRouterChatResponse;
    const choice = data.choices[0];

    return {
      provider: this.provider,
      model: data.model,
      text: choice?.message.content ?? '',
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      latencyMs,
      stopReason: choice?.finish_reason ?? null,
    };
  }
}
