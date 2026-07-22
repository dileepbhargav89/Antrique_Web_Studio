export class SupplierProductResponseDto {
  constructor(
    readonly id: string,
    readonly productVariantId: string | null,
    readonly fabricId: string | null,
    readonly supplierSku: string | null,
    readonly cost: string | null,
    readonly leadTimeDays: number | null,
  ) {}
}
