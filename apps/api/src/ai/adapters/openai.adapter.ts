import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  AiCompletionInput,
  AiCompletionResult,
  AiProvider,
  AiProviderAdapter,
} from '../ai-provider.interface';

export interface OpenAiAdapterConfig {
  apiKey?: string;
  model: string;
}

const DEFAULT_MAX_TOKENS = 1024;
const CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAiChatResponse {
  model: string;
  choices: Array<{ message: { content: string | null }; finish_reason: string | null }>;
  usage: { prompt_tokens: number; completion_tokens: number };
}

// Structurally complete against OpenAI's real Chat Completions API shape,
// live-untested — no OPENAI_API_KEY is configured this phase. Plain
// `fetch()`, not the `openai` SDK — see anthropic.adapter.ts's own header
// comment for why.
@Injectable()
export class OpenAiAdapter implements AiProviderAdapter {
  readonly provider: AiProvider = 'openai';

  constructor(private readonly config: OpenAiAdapterConfig) {}

  get isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    if (!this.config.apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI is not configured — set OPENAI_API_KEY (see apps/api/.env.example).',
      );
    }

    const startedAt = Date.now();
    const response = await fetch(CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
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
      throw new ServiceUnavailableException(`OpenAI request failed (${response.status}): ${body}`);
    }

    const latencyMs = Date.now() - startedAt;
    const data = (await response.json()) as OpenAiChatResponse;
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
