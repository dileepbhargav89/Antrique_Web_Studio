import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Nested DTO — only ever validated as part of
// CreateProductCustomizationDto.monogramOptions/
// UpdateProductCustomizationDto.monogramOptions (a full replace, at
// update) — no standalone MonogramOption controller exists this
// milestone. "Monogram rules are enforced" (this milestone's own
// business rule) is this DTO's own field validation
// (`maxCharacters` bounded 1–20, mirrored by a DB CHECK constraint) —
// see schema.prisma's own comment on why there's no customer-entered
// monogram TEXT to validate against these rules yet.
export class CreateMonogramOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxCharacters?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  allowedCharacters?: string;

  @IsOptional()
  @IsNumberString()
  priceAdjustment?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
