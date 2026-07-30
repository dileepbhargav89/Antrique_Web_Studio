export class QuotationItemResponseDto {
  constructor(
    readonly id: string,
    readonly description: string,
    readonly quantity: string,
    readonly unitPrice: string,
    readonly amount: string,
    readonly sortOrder: number,
  ) {}
}
