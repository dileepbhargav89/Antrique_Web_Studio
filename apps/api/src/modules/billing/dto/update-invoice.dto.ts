import { IsDateString, IsOptional, IsUUID } from 'class-validator';

// Request DTO for PATCH /invoices/:id — "Update draft invoice" (this
// milestone's own explicit business responsibility; not literally named
// in the "Controllers" list, added anyway — see
// docs/implementation/decisions.md). "Issued invoices immutable" is
// enforced by InvoiceService rejecting this call entirely once status
// isn't DRAFT, not by omitting fields here. No `orderId`/`clientId`/
// `customerId` — an invoice is never re-parented.
export class UpdateInvoiceDto {
  @IsOptional()
  @IsUUID()
  taxRateId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
