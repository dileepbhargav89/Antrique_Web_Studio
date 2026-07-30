import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ContentDraftType } from '../../../../generated/prisma/enums';
import { AI_PROVIDERS, type AiProvider } from '../../../ai';

export class GenerateContentDto {
  @IsEnum(ContentDraftType)
  type!: ContentDraftType;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  brief!: string;

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
