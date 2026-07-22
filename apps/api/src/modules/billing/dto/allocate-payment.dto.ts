import { IsNumberString, IsUUID } from 'class-validator';

// Request DTO for POST /payments/:id/allocate — "Allocate payment,"
// applies an (additional) amount from an already-recorded Payment
// against a specific Invoice. "Payment allocations cannot exceed
// payment amount" — PaymentService checks the payment's own remaining
// unallocated balance before writing; "Paid amount never exceeds
// invoice total" — PaymentService checks the target invoice's own
// remaining balance too.
export class AllocatePaymentDto {
  @IsUUID()
  invoiceId!: string;

  @IsNumberString()
  amount!: string;
}
