import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  IsInt,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ProductStatus } from '../../../../generated/prisma/enums';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../constants/catalog.constant';
import { CreateProductVariantDto } from './create-product-variant.dto';
import { CreateProductImageDto } from './create-product-image.dto';

// Request DTO for POST /products. `categoryId`/`collectionId` are both
// optional (schema.prisma's own reasoning: nothing in this milestone's
// brief requires either). `variants`/`images` are created together with
// the product via Prisma's nested-write `create` (see
// product.repository.ts) — Prisma wraps a nested write in an implicit
// transaction, satisfying "transactions where appropriate" for this
// specific operation without an explicit `$transaction` call. There is
// no corresponding field on UpdateProductDto — this milestone has no
// standalone variant/image management endpoint (see
// schema.prisma's ProductVariant/ProductImage comments).
export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_PATTERN_MESSAGE })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  collectionId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
}
