import { IsIn, IsInt, IsNumber, IsObject, IsOptional, Max, Min } from 'class-validator';
import { AI_PROVIDERS, type AiProvider } from '../../../ai';

// Calls a real AI provider (real cost, real latency) — deliberately its
// own DTO, not reusing RenderPromptTemplateDto, since it accepts
// provider/maxTokens/temperature overrides render-only never needs.
export class TestPromptTemplateDto {
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

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
