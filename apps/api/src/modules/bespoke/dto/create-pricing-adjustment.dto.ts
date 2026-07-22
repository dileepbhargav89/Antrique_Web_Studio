import {
  IsBoolean,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PricingAdjustmentType } from '../../../../generated/prisma/enums';

// Nested DTO — only ever validated as part of
// CreateProductCustomizationDto.pricingAdjustments (at create) or
// UpdateProductCustomizationDto.pricingAdjustments (a full replace, at
// update) — no standalone PricingAdjustment controller exists this
// milestone. `styleOptionId`, when given, must reference a style option
// that ALREADY EXISTS in this same product's customization —
// ProductCustomizationService validates this ("Style options belong to
// the selected product," this milestone's own business rule), which
// naturally means it can only be set meaningfully at UPDATE time (a
// nested create can't forward-reference a sibling row's not-yet-assigned
// id within the same request) — see that service's own comment.
// `amount` may be negative for FLAT (a discount); PERCENTAGE is bounded
// by a CHECK constraint in the migration ("Pricing adjustments are
// valid," this milestone's own business rule).
export class CreatePricingAdjustmentDto {
  @IsOptional()
  @IsUUID()
  styleOptionId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsEnum(PricingAdjustmentType)
  adjustmentType?: PricingAdjustmentType;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
