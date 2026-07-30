import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { AI_PROVIDERS, type AiProvider } from '../../../ai';

// Exactly one of clientId/leadId — same XOR shape Quotation's own
// lead-vs-client choice already establishes for "who is this proposal
// for" (a fresh-prospect draft vs. a repeat-business draft). Validated in
// ProposalGeneratorService (application-level), not a DB CHECK — this
// module writes nothing to the database, there is no row to constrain.
export class GenerateProposalDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  requirements!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  budgetRange?: string;

  @IsOptional()
  @IsIn(AI_PROVIDERS)
  provider?: AiProvider;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8192)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;
}
