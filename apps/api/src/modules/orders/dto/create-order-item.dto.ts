import { IsNumberString, IsObject, IsOptional, IsUUID } from 'class-validator';

// Nested DTO — only ever validated as part of CreateOrderDto.items,
// never its own request body: OrderItem has no standalone controller
// (created only as nested data under `POST /orders`, immutable
// afterward — see schema.prisma's own comment). `warehouseId` is
// explicit and required — this milestone's own brief has no automatic
// multi-warehouse fulfillment logic (that's real ERP-shaped complexity,
// explicitly out of scope), so the caller picks which warehouse fulfills
// each line, the same explicit-warehouse convention
// `bespoke`'s sibling milestone (Inventory)'s own `ReceiveStockDto`
// already established. `productCustomizationId`/`selectedOptions` are
// both optional — only bespoke items carry them; OrderService validates
// "Validate bespoke customization"/"Validate pricing adjustments" (this
// milestone's own business rules) when they're present.
export class CreateOrderItemDto {
  @IsUUID()
  warehouseId!: string;

  @IsUUID()
  productVariantId!: string;

  @IsNumberString()
  quantity!: string;

  @IsOptional()
  @IsUUID()
  productCustomizationId?: string;

  @IsOptional()
  @IsObject()
  selectedOptions?: Record<string, unknown>;
}
