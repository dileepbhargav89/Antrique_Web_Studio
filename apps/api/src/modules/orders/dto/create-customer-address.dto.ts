import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Nested DTO — only ever validated as part of
// CreateCustomerDto.addresses/UpdateCustomerDto.addresses (a full
// replace at update — see that file's own comment), never its own
// request body: no standalone CustomerAddress controller exists this
// milestone (see customer.repository.ts's own header comment).
export class CreateCustomerAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;
}
