import {
  IsArray,
  IsEnum,
  IsHexColor,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FabricStatus } from '../../../../generated/prisma/enums';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../constants/bespoke.constant';

// Request DTO for PATCH /fabrics/:id — top-level Fabric fields, plus
// `productIds` (a full-replace of this fabric's product links, when
// given — see fabric.repository.ts's setProductLinks()). No `images` —
// same "immutable after create, no standalone management endpoint"
// treatment catalog's own UpdateProductDto gives ProductVariant/
// ProductImage.
export class UpdateFabricDto {
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
  @IsUUID()
  fabricCategoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  composition?: string;

  @IsOptional()
  @IsHexColor()
  colorHex?: string;

  @IsOptional()
  @IsNumberString()
  priceAdjustment?: string;

  @IsOptional()
  @IsEnum(FabricStatus)
  status?: FabricStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds?: string[];
}
