import { IsDateString, IsOptional, IsUUID } from 'class-validator';

// Request DTO for POST /invoices — "Create from Order," this milestone's
// own explicit (and only) creation entry point. No `subtotalAmount`/
// `taxAmount`/`totalAmount` here — "Invoice totals derived from line
// items"/"Tax calculated server-side" (this milestone's own explicit
// rules) mean these are always computed by InvoiceService, never
// client-supplied. No `notes` — `Invoice` (Phase 1.1A, reused wholesale)
// has no such column.
export class CreateInvoiceDto {
  @IsUUID()
  orderId!: string;

  @IsOptional()
  @IsUUID()
  taxRateId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
