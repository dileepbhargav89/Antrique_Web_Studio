import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { SLUG_PATTERN, SLUG_PATTERN_MESSAGE } from '../constants/finance.constant';

// Request DTO for POST /vendors. `status` is intentionally absent — every
// Vendor starts ACTIVE (schema default); moving to INACTIVE/ARCHIVED
// happens only through PATCH /vendors/:id — no dedicated archive endpoint
// or `vendors:delete` permission, same "status change via the ordinary
// update route" shape `CreateClientDto` already establishes.
export class CreateVendorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: SLUG_PATTERN_MESSAGE })
  slug!: string;

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
}
