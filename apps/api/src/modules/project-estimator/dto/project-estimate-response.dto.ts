import type { AiProvider } from '../../../ai';

// Same "always return rawText/parsedSuccessfully" shape
// ProposalDraftResponseDto/RequirementAnalysisResponseDto already
// establish. `confidenceScore` is `number | null` — the model isn't
// guaranteed to return a clean number even when everything else parses;
// `null` means "not usable as a number," not "zero confidence."
export class ProjectEstimateResponseDto {
  constructor(
    readonly estimatedHours: string,
    readonly sprintCount: string,
    readonly teamSize: string,
    readonly budgetRange: string,
    readonly complexity: string,
    readonly dependencies: string[],
    readonly confidenceScore: number | null,
    readonly rawText: string,
    readonly parsedSuccessfully: boolean,
    readonly provider: AiProvider,
    readonly model: string,
    readonly inputTokens: number,
    readonly outputTokens: number,
    readonly latencyMs: number,
  ) {}
}
