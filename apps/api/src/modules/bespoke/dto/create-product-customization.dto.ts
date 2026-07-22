import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateStyleOptionGroupDto } from './create-style-option-group.dto';
import { CreatePricingAdjustmentDto } from './create-pricing-adjustment.dto';
import { CreateMonogramOptionDto } from './create-monogram-option.dto';

// Request DTO for POST /product-customizations. `styleOptionGroups`
// (each with its own initial `styleOptions`) are created together with
// the customization via Prisma's nested-write `create` — structural,
// set once (see style-option.repository.ts's own comment; new options
// can still be added later via the standalone StyleOption endpoint).
// `pricingAdjustments`/`monogramOptions` may also be seeded here, but
// any `styleOptionId` on a pricing adjustment can only reference an
// option that already exists BEFORE this request — in practice that
// means flat/untriggered adjustments at create time, with per-option
// pricing rules added via PATCH once the nested style options have real
// ids (see product-customization.service.ts's own comment).
export class CreateProductCustomizationDto {
  @IsUUID()
  productId!: string;

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
  @Type(() => CreateStyleOptionGroupDto)
  styleOptionGroups?: CreateStyleOptionGroupDto[];

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
