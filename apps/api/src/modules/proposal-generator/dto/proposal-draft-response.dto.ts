import type { AiProvider } from '../../../ai';

// A DRAFT only — this module never writes a Quotation row (see
// proposal-generator.service.ts's own header comment for why). `rawText`
// is always populated (the model's real output); the structured fields
// are the best-effort parse of it — populated when the model's JSON
// parsed cleanly, empty/default otherwise, so a caller can always fall
// back to `rawText` for human editing even on a parse failure.
export class ProposalDraftResponseDto {
  constructor(
    readonly scope: string,
    readonly deliverables: string[],
    readonly timeline: string,
    readonly pricingAssumptions: string[],
    readonly risks: string[],
    readonly exclusions: string[],
    readonly technologyStack: string[],
    readonly rawText: string,
    readonly parsedSuccessfully: boolean,
    readonly provider: AiProvider,
    readonly model: string,
    readonly inputTokens: number,
    readonly outputTokens: number,
    readonly latencyMs: number,
  ) {}
}
