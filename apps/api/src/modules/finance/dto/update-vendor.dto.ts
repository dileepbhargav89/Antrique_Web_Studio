import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { VendorStatus } from '../../../../generated/prisma/enums';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../constants/finance.constant';

// Request DTO for PATCH /vendors/:id. `status` IS present here (unlike a
// dedicated archive-action route) — no `vendors:delete` permission is
// seeded, so moving ACTIVE -> INACTIVE/ARCHIVED happens through this same
// general-purpose update, same shape `UpdateClientDto` already establishes.
export class UpdateVendorDto {
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
  @IsString()
  @MaxLength(20)
  gstin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;
}
