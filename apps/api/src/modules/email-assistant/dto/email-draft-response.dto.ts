import type { AiProvider } from '../../../ai';

// Same "always return rawText/parsedSuccessfully" fallback shape every
// Phase 8 generation feature uses (Steps 3-6's ephemeral pattern — Step 8
// has no "store drafts" instruction, unlike Step 7). `subject`/`body` are
// `''` (not fabricated content) when parsing fails, matching Proposal
// Generator's own empty-string-field fallback.
export class EmailDraftResponseDto {
  constructor(
    readonly subject: string,
    readonly body: string,
    readonly rawText: string,
    readonly parsedSuccessfully: boolean,
    readonly provider: AiProvider,
    readonly model: string,
    readonly inputTokens: number,
    readonly outputTokens: number,
    readonly latencyMs: number,
  ) {}
}
