import { IsNumberString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

// Request DTO for POST /inventory/receive. Find-or-create: if no
// InventoryItem exists yet for (warehouseId, productVariantId|fabricId),
// InventoryService creates one with this as its opening balance;
// otherwise the quantity is added to the existing item's onHand.
// Exactly one of `productVariantId`/`fabricId` must be given — validated
// by InventoryService (the same XOR the database's own CHECK constraint
// enforces as the backstop — see schema.prisma's own comment on
// InventoryItem), not a custom class-validator decorator, matching
// MeasurementService's own "business validation lives in the service"
// precedent for a comparably narrow, one-off rule.
export class ReceiveStockDto {
  @IsUUID()
  warehouseId!: string;

  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @IsOptional()
  @IsUUID()
  fabricId?: string;

  @IsNumberString()
  quantity!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
