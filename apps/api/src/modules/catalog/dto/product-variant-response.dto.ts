export class ProductVariantResponseDto {
  constructor(
    readonly id: string,
    readonly sku: string,
    readonly name: string | null,
    readonly attributes: unknown,
    readonly price: string,
    readonly isActive: boolean,
    readonly sortOrder: number,
  ) {}
}
