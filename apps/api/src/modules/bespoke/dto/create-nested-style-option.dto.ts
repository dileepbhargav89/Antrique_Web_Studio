import {
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { StyleOptionStatus } from '../../../../generated/prisma/enums';

// Nested DTO — only ever validated as part of
// CreateStyleOptionGroupDto.styleOptions (see that file's
// `@ValidateNested({ each: true })`), never its own request body. No
// `styleOptionGroupId` (implied by nesting) and no
// `incompatibleStyleOptionIds` (the other side of an incompatibility
// pair can't exist yet within the same creation payload — see
// product-customization.service.ts's own comment; incompatibilities are
// set via the standalone StyleOption endpoint once real ids exist).
export class CreateNestedStyleOptionDto {
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
}
