import { InvoiceStatus } from '../../../../generated/prisma/enums';
import { InvoiceItemResponseDto } from './invoice-item-response.dto';

// `outstandingBalance` is computed (`totalAmount - amountPaid`) at
// mapper time, never stored — "Outstanding balance always consistent"
// (this milestone's own explicit rule) is easiest to keep true by never
// letting it drift from its own two source-of-truth columns in the
// first place. `items` optional — same detail-vs-list convention as
// every other module's own aggregate-root response DTO.
export class InvoiceResponseDto {
  constructor(
    readonly id: string,
    readonly invoiceNumber: string,
    readonly clientId: string | null,
    readonly customerId: string | null,
    readonly orderId: string | null,
    readonly taxRateId: string | null,
    readonly currency: string,
    readonly subtotalAmount: string,
    readonly taxAmount: string,
    readonly discountAmount: string,
    readonly totalAmount: string,
    readonly amountPaid: string,
    readonly outstandingBalance: string,
    readonly status: InvoiceStatus,
    readonly issuedDate: Date | null,
    readonly dueDate: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly items?: InvoiceItemResponseDto[],
  ) {}
}
