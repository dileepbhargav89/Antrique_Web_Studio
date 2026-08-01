import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

// Nested payment-stage row for POST/PATCH /quotations — `amount` is
// deliberately absent (computed server-side as
// `totalAmount * percentage / 100`, same "never trust a client-supplied
// amount" discipline CreateQuotationItemDto already establishes).
export class CreatePaymentStageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  triggerNote?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;
}
