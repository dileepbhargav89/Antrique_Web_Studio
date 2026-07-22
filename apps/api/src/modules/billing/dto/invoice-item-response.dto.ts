export class InvoiceItemResponseDto {
  constructor(
    readonly id: string,
    readonly description: string,
    readonly quantity: string,
    readonly unitPrice: string,
    readonly amount: string,
    readonly sortOrder: number,
  ) {}
}
