import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaxRateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  // Percentage, 0-100 — the database's own `tax_rates_rate_check` CHECK
  // constraint is the real backstop.
  @IsNumberString()
  rate!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
