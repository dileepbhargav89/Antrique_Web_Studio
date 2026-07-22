import { IsNumberString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Request DTO for POST /payments — "Record payment." `invoiceId` is
// OPTIONAL: "Record payment" and "Allocate payment" are separate
// business responsibilities (this milestone's own explicit split) — a
// payment may be recorded before it's tied to any specific invoice. When
// `invoiceId` IS given, PaymentService immediately allocates the full
// amount to it in the same transaction (the common single-invoice case).
// Either `paymentMethodId` or `method` must be given (mirrors
// CreateLeadDto's own source/leadSourceId dual-input pattern from
// Milestone 9) — PaymentService resolves the final `method` string from
// whichever is provided.
export class RecordPaymentDto {
  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;
}
