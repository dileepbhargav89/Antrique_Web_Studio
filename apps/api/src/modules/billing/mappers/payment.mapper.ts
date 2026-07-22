import { Payment } from '../../../../generated/prisma/client';
import { PaymentResponseDto } from '../dto/payment-response.dto';

export function toPaymentResponseDto(payment: Payment): PaymentResponseDto {
  return new PaymentResponseDto(
    payment.id,
    payment.invoiceId,
    payment.paymentMethodId,
    payment.method,
    payment.reference,
    payment.amount.toString(),
    payment.currency,
    payment.status,
    payment.createdAt,
  );
}
