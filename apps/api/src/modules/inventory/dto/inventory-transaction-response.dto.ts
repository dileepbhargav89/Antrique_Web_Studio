import { InventoryTransactionType } from '../../../../generated/prisma/enums';

export class InventoryTransactionResponseDto {
  constructor(
    readonly id: string,
    readonly inventoryItemId: string,
    readonly type: InventoryTransactionType,
    readonly onHandDelta: string,
    readonly reservedDelta: string,
    readonly onHandAfter: string,
    readonly reservedAfter: string,
    readonly reason: string | null,
    readonly referenceId: string | null,
    readonly createdAt: Date,
  ) {}
}
