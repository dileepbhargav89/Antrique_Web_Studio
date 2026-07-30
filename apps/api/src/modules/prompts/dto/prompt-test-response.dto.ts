import type { AiProvider } from '../../../ai';

export class PromptTestResponseDto {
  constructor(
    readonly renderedPrompt: string,
    readonly provider: AiProvider,
    readonly model: string,
    readonly text: string,
    readonly inputTokens: number,
    readonly outputTokens: number,
    readonly latencyMs: number,
    readonly stopReason: string | null,
  ) {}
}
