import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { PromptCategory } from '../../../../generated/prisma/enums';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../../crm/constants/crm.constant';

// Request DTO for POST /prompt-templates. `isActive` is intentionally
// absent — every template starts active (schema default), same "starts
// at the sensible default, not settable on create" convention
// CreateClientDto/CreateProjectDto already follow.
export class CreatePromptTemplateDto {
  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_PATTERN_MESSAGE })
  @MaxLength(100)
  key!: string;

  @IsEnum(PromptCategory)
  category!: PromptCategory;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  template!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  variables!: string[];
}
