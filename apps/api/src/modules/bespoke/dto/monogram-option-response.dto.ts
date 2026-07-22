export class MonogramOptionResponseDto {
  constructor(
    readonly id: string,
    readonly label: string,
    readonly maxCharacters: number,
    readonly allowedCharacters: string | null,
    readonly priceAdjustment: string,
    readonly isActive: boolean,
  ) {}
}
