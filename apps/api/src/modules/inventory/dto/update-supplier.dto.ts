import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SupplierStatus } from '../../../../generated/prisma/enums';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../constants/inventory.constant';
import { CreateSupplierProductDto } from './create-supplier-product.dto';

// Request DTO for PATCH /suppliers/:id. `products`, when provided, FULLY
// REPLACES the existing set (delete-then-create, one transaction — see
// supplier.repository.ts's replaceSupplierProducts()) — the same
// "mutable data, not one-time structure" reasoning
// bespoke/dto/update-measurement-profile.dto.ts's own `measurements`
// field established: a supplier's product list realistically changes
// over time, unlike catalog's own immutable-after-create variants.
export class UpdateSupplierDto {
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
  @MaxLength(200)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactPhone?: string;

  @IsOptional()
  @IsEnum(SupplierStatus)
  status?: SupplierStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierProductDto)
  products?: CreateSupplierProductDto[];
}
