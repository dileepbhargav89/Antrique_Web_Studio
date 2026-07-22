import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateNestedStyleOptionDto } from './create-nested-style-option.dto';

// Nested DTO — only ever validated as part of
// CreateProductCustomizationDto.styleOptionGroups, never its own request
// body: StyleOptionGroup has no standalone controller (see
// style-option.repository.ts's own header comment) — created once, as
// part of the customization's initial structure.
export class CreateStyleOptionGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNestedStyleOptionDto)
  styleOptions?: CreateNestedStyleOptionDto[];
}
