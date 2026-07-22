import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StyleOptionStatus } from '../../../../generated/prisma/enums';

// Request DTO for POST /style-options. `styleOptionGroupId` must
// reference an existing StyleOptionGroup — created only as nested data
// under ProductCustomization (see style-option.repository.ts's own
// header comment) — StyleOptionService validates it belongs to the
// caller's tenant. `incompatibleStyleOptionIds` is this milestone's own
// "Incompatible style combinations are rejected" business rule, modeled
// as admin-configured metadata (see schema.prisma's own comment on
// StyleOptionIncompatibility) — each id is validated to belong to the
// SAME product's customization as this style option.
export class CreateStyleOptionDto {
  @IsUUID()
  styleOptionGroupId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumberString()
  priceAdjustment?: string;

  @IsOptional()
  @IsEnum(StyleOptionStatus)
  status?: StyleOptionStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  incompatibleStyleOptionIds?: string[];
}
