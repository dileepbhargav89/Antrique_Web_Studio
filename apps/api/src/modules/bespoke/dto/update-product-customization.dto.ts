import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreatePricingAdjustmentDto } from './create-pricing-adjustment.dto';
import { CreateMonogramOptionDto } from './create-monogram-option.dto';

// Request DTO for PATCH /product-customizations/:id. No
// `styleOptionGroups` — structural, immutable after create (see
// create-product-customization.dto.ts's own comment; the standalone
// StyleOption endpoint is how the option catalog evolves afterward).
// `pricingAdjustments`/`monogramOptions`, when provided, FULLY REPLACE
// the existing set (see product-customization.repository.ts's
// replacePricingAdjustments()/replaceMonogramOptions()) — this is where a
// `styleOptionId` on a pricing adjustment can meaningfully reference a
// real, already-created style option.
export class UpdateProductCustomizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePricingAdjustmentDto)
  pricingAdjustments?: CreatePricingAdjustmentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMonogramOptionDto)
  monogramOptions?: CreateMonogramOptionDto[];
}
