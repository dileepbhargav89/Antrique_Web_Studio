import type { AiProvider } from '../../../ai';

// Same "always return rawText/parsedSuccessfully so a caller can fall
// back to manual review" shape ProposalDraftResponseDto already
// establishes — see that DTO's own header comment.
export class RequirementAnalysisResponseDto {
  constructor(
    readonly features: string[],
    readonly modules: string[],
    readonly risks: string[],
    readonly timelineEstimate: string,
    readonly questions: string[],
    readonly rawText: string,
    readonly parsedSuccessfully: boolean,
    readonly documentUrl: string,
    readonly filename: string,
    readonly truncated: boolean,
    readonly provider: AiProvider,
    readonly model: string,
    readonly inputTokens: number,
    readonly outputTokens: number,
    readonly latencyMs: number,
  ) {}
}
