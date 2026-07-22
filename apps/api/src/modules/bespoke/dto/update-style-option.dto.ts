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

// Request DTO for PATCH /style-options/:id.
export class UpdateStyleOptionDto {
  @IsOptional()
  @IsUUID()
  styleOptionGroupId?: string;

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
