import { IsNumber, IsString, Min, MinLength, MaxLength } from 'class-validator';

// Nested line item for POST /quotations — `amount` is deliberately absent
// (computed server-side as quantity * unitPrice, never trusted from the
// client — see quotation.service.ts).
export class CreateQuotationItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;
}
