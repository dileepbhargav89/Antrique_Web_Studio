import { Quotation, QuotationItem } from '../../../../generated/prisma/client';
import { QuotationResponseDto } from '../dto/quotation-response.dto';
import { QuotationItemResponseDto } from '../dto/quotation-item-response.dto';

function toQuotationItemResponseDto(item: QuotationItem): QuotationItemResponseDto {
  return new QuotationItemResponseDto(
    item.id,
    item.description,
    item.quantity.toString(),
    item.unitPrice.toString(),
    item.amount.toString(),
    item.sortOrder,
  );
}

export function toQuotationResponseDto(
  quotation: Quotation,
  items?: QuotationItem[],
): QuotationResponseDto {
  return new QuotationResponseDto(
    quotation.id,
    quotation.quotationNumber,
    quotation.leadId,
    quotation.clientId,
    quotation.currency,
    quotation.subtotalAmount.toString(),
    quotation.taxAmount.toString(),
    quotation.discountAmount.toString(),
    quotation.totalAmount.toString(),
    quotation.status,
    quotation.validUntil,
    quotation.issuedAt,
    quotation.notes,
    quotation.pdfUrl,
    quotation.createdAt,
    quotation.updatedAt,
    items?.map(toQuotationItemResponseDto),
  );
}
