import {
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
import { AI_PROVIDERS, type AiProvider } from '../../../ai';
import { EMAIL_TYPES, type EmailType } from '../constants/email-assistant.constant';

export class GenerateEmailDto {
  @IsIn(EMAIL_TYPES)
  type!: EmailType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  recipientName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  purpose!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  keyPoints?: string;

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
