import {
  InventoryItem,
  InventoryReservation,
  InventoryTransaction,
} from '../../../../generated/prisma/client';
import { InventoryItemResponseDto } from '../dto/inventory-item-response.dto';
import { InventoryTransactionResponseDto } from '../dto/inventory-transaction-response.dto';
import { InventoryReservationResponseDto } from '../dto/inventory-reservation-response.dto';

// "Available = OnHand − Reserved" (this milestone's own business rule) —
// computed here, the one place an InventoryItem row becomes a response,
// never stored on the row itself (see schema.prisma's own comment).
export function toInventoryItemResponseDto(item: InventoryItem): InventoryItemResponseDto {
  const available = item.onHand.sub(item.reserved);
  return new InventoryItemResponseDto(
    item.id,
    item.warehouseId,
    item.productVariantId,
    item.fabricId,
    item.onHand.toString(),
    item.reserved.toString(),
    available.toString(),
    item.reorderPoint?.toString() ?? null,
    item.createdAt,
    item.updatedAt,
  );
}

export function toInventoryTransactionResponseDto(
  transaction: InventoryTransaction,
): InventoryTransactionResponseDto {
  return new InventoryTransactionResponseDto(
    transaction.id,
    transaction.inventoryItemId,
    transaction.type,
    transaction.onHandDelta.toString(),
    transaction.reservedDelta.toString(),
    transaction.onHandAfter.toString(),
    transaction.reservedAfter.toString(),
    transaction.reason,
    transaction.referenceId,
    transaction.createdAt,
  );
}

export function toInventoryReservationResponseDto(
  reservation: InventoryReservation,
): InventoryReservationResponseDto {
  return new InventoryReservationResponseDto(
    reservation.id,
    reservation.inventoryItemId,
    reservation.quantity.toString(),
    reservation.status,
    reservation.reference,
    reservation.notes,
    reservation.createdAt,
    reservation.updatedAt,
  );
}
