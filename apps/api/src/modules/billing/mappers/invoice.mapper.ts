import { Invoice, InvoiceItem, Prisma } from '../../../../generated/prisma/client';
import { InvoiceResponseDto } from '../dto/invoice-response.dto';
import { InvoiceItemResponseDto } from '../dto/invoice-item-response.dto';

function toInvoiceItemResponseDto(item: InvoiceItem): InvoiceItemResponseDto {
  return new InvoiceItemResponseDto(
    item.id,
    item.description,
    item.quantity.toString(),
    item.unitPrice.toString(),
    item.amount.toString(),
    item.sortOrder,
  );
}

export function toInvoiceResponseDto(invoice: Invoice, items?: InvoiceItem[]): InvoiceResponseDto {
  const outstandingBalance = invoice.totalAmount.sub(invoice.amountPaid) as Prisma.Decimal;
  return new InvoiceResponseDto(
    invoice.id,
    invoice.invoiceNumber,
    invoice.clientId,
    invoice.customerId,
    invoice.orderId,
    invoice.taxRateId,
    invoice.currency,
    invoice.subtotalAmount.toString(),
    invoice.taxAmount.toString(),
    invoice.discountAmount.toString(),
    invoice.totalAmount.toString(),
    invoice.amountPaid.toString(),
    outstandingBalance.toString(),
    invoice.status,
    invoice.issuedDate,
    invoice.dueDate,
    invoice.createdAt,
    invoice.updatedAt,
    items?.map(toInvoiceItemResponseDto),
  );
}
