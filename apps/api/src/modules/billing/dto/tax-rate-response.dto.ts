export class TaxRateResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly rate: string,
    readonly isActive: boolean,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
