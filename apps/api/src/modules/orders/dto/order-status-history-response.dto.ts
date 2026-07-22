import { OrderStatus } from '../../../../generated/prisma/enums';

export class OrderStatusHistoryResponseDto {
  constructor(
    readonly id: string,
    readonly status: OrderStatus,
    readonly previousStatus: OrderStatus | null,
    readonly note: string | null,
    readonly createdAt: Date,
  ) {}
}
