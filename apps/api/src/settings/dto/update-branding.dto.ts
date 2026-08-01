import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

// Request DTO for PATCH /settings/branding. Every field optional — this
// is a partial update against the single `Setting{key:'branding'}` JSON
// blob (SettingsService shallow-merges into whatever's already stored),
// not a full-replace PUT. `logoUrl`/`logoStorageKey` are deliberately
// absent — those are only ever set by POST /settings/branding/logo,
// never accepted as raw client input (same "server never trusts
// client-supplied storage keys" discipline as everywhere else that calls
// StorageService).
export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  // Free text, rendered verbatim in the payment-schedule page of a
  // quotation PDF (account name/number/IFSC/SWIFT etc.) — deliberately
  // unstructured, bank-detail formats vary too widely to model as fields.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bankDetails?: string;
}
