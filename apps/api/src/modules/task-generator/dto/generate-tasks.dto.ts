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

// `projectId` is required even though this action writes nothing itself
// — the caller needs it for the follow-up `POST /task-generator/approve`
// call anyway (Task.projectId is required), and requiring it here keeps
// generate/approve symmetric. Exactly one of milestoneId/requirements —
// "From requirements or milestones" (this step's own brief).
export class GenerateTasksDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  requirements?: string;

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
