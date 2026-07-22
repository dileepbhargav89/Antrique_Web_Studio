import { PaymentStatus } from '../../../../generated/prisma/enums';

export class PaymentResponseDto {
  constructor(
    readonly id: string,
    readonly invoiceId: string | null,
    readonly paymentMethodId: string | null,
    readonly method: string,
    readonly reference: string | null,
    readonly amount: string,
    readonly currency: string,
    readonly status: PaymentStatus,
    readonly createdAt: Date,
  ) {}
}
