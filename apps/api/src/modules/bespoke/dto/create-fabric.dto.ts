import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';
import { FabricStatus } from '../../../../generated/prisma/enums';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../constants/bespoke.constant';
import { CreateFabricImageDto } from './create-fabric-image.dto';

// Request DTO for POST /fabrics. `images` are created together with the
// fabric via Prisma's nested-write `create` (see fabric.repository.ts) —
// same "implicit transaction" reasoning as catalog's own
// create-product.dto.ts. `productIds` links this fabric to existing
// Products (the "Product → Fabrics" many-to-many — see schema.prisma's
// own comment on product_fabrics); FabricService validates each id
// belongs to the caller's tenant before linking ("Fabrics belong to the
// current tenant" — this milestone's own business rule, applied to the
// product side of the link too).
export class CreateFabricDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_PATTERN_MESSAGE })
  slug!: string;

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

  // Plain stored delta — may be negative (a discount). Sent as a numeric
  // string, same `IsNumberString` convention as money fields elsewhere in
  // this codebase's DTOs, avoiding float-precision loss for a 2-decimal
  // amount.
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
  @ValidateNested({ each: true })
  @Type(() => CreateFabricImageDto)
  images?: CreateFabricImageDto[];

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds?: string[];
}
