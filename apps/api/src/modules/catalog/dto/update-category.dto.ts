import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CategoryStatus } from '../../../../generated/prisma/enums';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../constants/catalog.constant';

// Request DTO for PATCH /categories/:id — every field optional (partial
// update). Hand-written, not `PartialType()` (`@nestjs/mapped-types` is
// not a dependency of this app, and one field's worth of duplication
// against CreateCategoryDto doesn't justify adding one).
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_PATTERN_MESSAGE })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
