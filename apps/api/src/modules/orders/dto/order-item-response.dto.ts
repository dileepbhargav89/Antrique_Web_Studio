export class OrderItemResponseDto {
  constructor(
    readonly id: string,
    readonly productVariantId: string,
    readonly productCustomizationId: string | null,
    readonly inventoryReservationId: string | null,
    readonly quantity: string,
    readonly unitPrice: string,
    readonly pricingAdjustmentsTotal: string,
    readonly lineTotal: string,
    readonly selectedOptions: unknown,
  ) {}
}
