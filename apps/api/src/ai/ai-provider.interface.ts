// Phase 8 (AI Workspace) — the one contract every adapter implements and
// the one shape AiService/every future AI feature (proposal generator,
// requirement analyzer, ...) depends on. No business logic anywhere in
// this app should import a concrete adapter directly — only this
// interface, AiProvider, and AiService itself.
export type AiProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter';

export const AI_PROVIDERS: readonly AiProvider[] = ['anthropic', 'openai', 'gemini', 'openrouter'];

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiCompletionInput {
  /** System/instruction prompt — kept separate from `messages`, matching
   * how every one of the four real provider APIs models it (Anthropic's
   * own top-level `system`, OpenAI/OpenRouter's `system` role message,
   * Gemini's `systemInstruction`), rather than forcing callers to know
   * each provider's own convention. */
  system?: string;
  messages: AiMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AiCompletionResult {
  provider: AiProvider;
  model: string;
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  stopReason: string | null;
}

export interface AiProviderAdapter {
  readonly provider: AiProvider;
  readonly isConfigured: boolean;
  complete(input: AiCompletionInput): Promise<AiCompletionResult>;
}
