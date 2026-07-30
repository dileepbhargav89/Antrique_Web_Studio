import type { AiProvider } from '../../../ai';
import { TaskSuggestionDto } from './task-suggestion.dto';

// Same "always return rawText/parsedSuccessfully" fallback shape every
// Phase 8 generation feature uses. `suggestions` is `[]` (not partial
// data) when parsing fails — see the service's own tryParseSuggestions()
// comment for why a partial parse isn't attempted.
export class TaskGenerationResponseDto {
  constructor(
    readonly suggestions: TaskSuggestionDto[],
    readonly rawText: string,
    readonly parsedSuccessfully: boolean,
    readonly provider: AiProvider,
    readonly model: string,
    readonly inputTokens: number,
    readonly outputTokens: number,
    readonly latencyMs: number,
  ) {}
}
