import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  AiCompletionInput,
  AiCompletionResult,
  AiProvider,
  AiProviderAdapter,
} from '../ai-provider.interface';

export interface GeminiAdapterConfig {
  apiKey?: string;
  model: string;
}

const DEFAULT_MAX_TOKENS = 1024;
const GENERATIVE_LANGUAGE_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiGenerateContentResponse {
  candidates: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
}

// Structurally complete against Gemini's real generateContent API shape,
// live-untested — no GOOGLE_AI_API_KEY is configured this phase. Gemini's
// own wire format uses `role: "model"` for the AI's turn (not
// "assistant") and a separate `systemInstruction` field rather than a
// system-role message — both translated here so AiCompletionInput stays
// provider-agnostic. See anthropic.adapter.ts's own header comment for
// why this is plain `fetch()`, not an SDK.
@Injectable()
export class GeminiAdapter implements AiProviderAdapter {
  readonly provider: AiProvider = 'gemini';

  constructor(private readonly config: GeminiAdapterConfig) {}

  get isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async complete(input: AiCompletionInput): Promise<AiCompletionResult> {
    if (!this.config.apiKey) {
      throw new ServiceUnavailableException(
        'Gemini is not configured — set GOOGLE_AI_API_KEY (see apps/api/.env.example).',
      );
    }

    const startedAt = Date.now();
    const url = `${GENERATIVE_LANGUAGE_BASE_URL}/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(input.system ? { systemInstruction: { parts: [{ text: input.system }] } } : {}),
        contents: input.messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
          temperature: input.temperature,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceUnavailableException(`Gemini request failed (${response.status}): ${body}`);
    }

    const latencyMs = Date.now() - startedAt;
    const data = (await response.json()) as GeminiGenerateContentResponse;
    const candidate = data.candidates[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';

    return {
      provider: this.provider,
      model: this.config.model,
      text,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs,
      stopReason: candidate?.finishReason ?? null,
    };
  }
}
