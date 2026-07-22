// `available` is computed (`onHand - reserved`) at mapper time, never
// stored — see schema.prisma's own comment on InventoryItem for why.
export class InventoryItemResponseDto {
  constructor(
    readonly id: string,
    readonly warehouseId: string,
    readonly productVariantId: string | null,
    readonly fabricId: string | null,
    readonly onHand: string,
    readonly reserved: string,
    readonly available: string,
    readonly reorderPoint: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
