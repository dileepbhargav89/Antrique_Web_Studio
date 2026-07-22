import { ReservationStatus } from '../../../../generated/prisma/enums';

export class InventoryReservationResponseDto {
  constructor(
    readonly id: string,
    readonly inventoryItemId: string,
    readonly quantity: string,
    readonly status: ReservationStatus,
    readonly reference: string | null,
    readonly notes: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
