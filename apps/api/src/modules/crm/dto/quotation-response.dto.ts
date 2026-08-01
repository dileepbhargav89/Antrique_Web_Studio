import { QuotationStatus } from '../../../../generated/prisma/enums';
import { QuotationItemResponseDto } from './quotation-item-response.dto';
import { PaymentStageResponseDto } from './payment-stage-response.dto';

export class QuotationResponseDto {
  constructor(
    readonly id: string,
    readonly quotationNumber: string,
    readonly leadId: string | null,
    readonly clientId: string | null,
    readonly currency: string,
    readonly subtotalAmount: string,
    readonly taxAmount: string,
    readonly discountAmount: string,
    readonly totalAmount: string,
    readonly status: QuotationStatus,
    readonly validUntil: Date | null,
    readonly issuedAt: Date | null,
    readonly notes: string | null,
    readonly pdfUrl: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly items?: QuotationItemResponseDto[],
    readonly paymentStages?: PaymentStageResponseDto[],
  ) {}
}
