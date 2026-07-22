import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// No `slug` — immutable after creation, same discipline every other
// module's own update DTO applies to its slug/sku field.
export class UpdateCustomerTagDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
