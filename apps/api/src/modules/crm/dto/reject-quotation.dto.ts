import { IsOptional, IsString, MaxLength } from 'class-validator';

// Request DTO for POST /quotations/:id/reject. `reason` isn't persisted
// anywhere on Quotation (no metadata column) — same accepted-gap shape
// as VoidInvoiceDto's own `reason` (billing module), kept for symmetry
// and because a future ActivityLog write (Phase 6) can use it even
// though it isn't stored on the row itself.
export class RejectQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
